
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { CertificateClient } from "@/app/courses/[courseId]/certificate/certificate-client";
import { getSession } from "@/lib/auth";

async function getCertificateData(pathId: string, user: { id: string, name: string }) {

    const learningPath = await prisma.learningPath.findUnique({
        where: { id: pathId },
        include: { 
            courses: {
                orderBy: { order: 'asc' },
                include: {
                    course: {
                        include: {
                            quiz: {
                                select: {
                                    passingScore: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!learningPath || !learningPath.trainingProviderId) {
        return { template: null, learningPath: null, completionDate: null };
    }
    
    const template = await prisma.certificateTemplate.findUnique({
        where: { trainingProviderId: learningPath.trainingProviderId },
    });

    const courseIds = learningPath.courses.map(c => c.courseId);
    
    const completions = await prisma.userCompletedCourse.findMany({
        where: {
            userId: user.id,
            courseId: { in: courseIds }
        },
        orderBy: {
            completionDate: 'desc'
        }
    });
    
    const completionMap = new Map(completions.map(c => [c.courseId, c.score]));

    // A path is completed if every course in it has a completion record
    // AND the score meets the passing requirement for that course's quiz if a quiz exists.
    const isPathCompleted = learningPath.courses.every(({ course }) => {
        const score = completionMap.get(course.id);
        if (score === undefined) {
            return false; // Not completed at all
        }
        if (course.quiz) {
            return score >= course.quiz.passingScore; // Must pass the quiz
        }
        // If there's no quiz, having a completion record is enough.
        return true; 
    });


    if (!isPathCompleted) {
        return { template: null, learningPath: null, completionDate: null };
    }

    // Use the most recent completion date from any course in the path as the issue date.
    const latestCompletionDate = completions[0]?.completionDate;

    return { template, learningPath, completionDate: latestCompletionDate };
}


export default async function LearningPathCertificatePage({ params }: { params: { pathId: string } }) {
    const user = await getSession();
    if (!user) {
        notFound();
    }
    const { pathId } = params;
    const { template, learningPath, completionDate } = await getCertificateData(pathId, user);

    if (!template || !learningPath || !completionDate) {
        notFound();
    }
    
    return (
        <CertificateClient 
            template={template}
            item={learningPath}
            itemType="path"
            user={user}
            completionDate={completionDate}
        />
    )
}
