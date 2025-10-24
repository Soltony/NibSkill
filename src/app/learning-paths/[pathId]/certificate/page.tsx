
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { CertificateClient } from "./certificate-client";
import { getSession } from "@/lib/auth";

async function getCertificateData(pathId: string, user: { id: string, name: string }) {

    const learningPath = await prisma.learningPath.findUnique({
        where: { id: pathId },
        include: { courses: true }
    });

    if (!learningPath || !learningPath.trainingProviderId) {
        return { template: null, learningPath: null, completionDate: null };
    }
    
    const template = await prisma.certificateTemplate.findUnique({
        where: { trainingProviderId: learningPath.trainingProviderId },
    });

    const courseIds = learningPath.courses.map(c => c.courseId);
    
    // Check if this specific user has completed ALL courses in this path
    const completions = await prisma.userCompletedCourse.findMany({
        where: {
            userId: user.id,
            courseId: { in: courseIds }
        },
        orderBy: {
            completionDate: 'desc'
        }
    });

    const isPathCompleted = courseIds.every(id => completions.some(c => c.courseId === id));

    if (!isPathCompleted) {
        return { template: null, learningPath: null, completionDate: null };
    }

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
            path={learningPath}
            user={user}
            completionDate={completionDate}
        />
    )
}
