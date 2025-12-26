
'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { SubmissionStatus } from '@prisma/client';

type SubmissionData = {
    userId: string;
    quizId: string;
    answers: { [questionId: string]: string | string[] };
};

export async function createSubmission(data: SubmissionData) {
    try {
        const { userId, quizId, answers } = data;

        const questions = await prisma.question.findMany({
            where: {
                quizId: quizId,
                id: {
                    in: Object.keys(answers)
                }
            },
            select: {
                id: true,
                type: true
            }
        });

        const questionTypeMap = new Map(questions.map(q => [q.id, q.type]));

        const submission = await prisma.quizSubmission.create({
            data: {
                userId,
                quizId,
                status: SubmissionStatus.PENDING_REVIEW,
                answers: {
                    create: Object.entries(answers).map(([questionId, answer]) => {
                        const questionType = questionTypeMap.get(questionId);
                        const isOptionBased = questionType === 'MULTIPLE_CHOICE' || questionType === 'TRUE_FALSE';
                        
                        return {
                            questionId,
                            selectedOptionId: isOptionBased ? (Array.isArray(answer) ? answer[0] : answer as string) : undefined,
                            answerText: !isOptionBased ? answer as string : undefined,
                        };
                    }),
                },
            },
        });
        
        revalidatePath('/admin/grading');
        return { success: true, submission };

    } catch (error) {
        console.error("Error creating submission:", error);
        return { success: false, message: 'Failed to submit quiz for review.' };
    }
}

export async function gradeSubmission({ submissionId, finalScore }: { submissionId: string, finalScore: number }) {
    try {
        const submission = await prisma.quizSubmission.findUnique({
            where: { id: submissionId },
            include: { 
                quiz: { 
                    include: { 
                        course: {
                            include: { modules: { select: { id: true } } }
                        } 
                    } 
                } 
            }
        });
        
        if (!submission || !submission.quiz || !submission.quiz.course) {
            return { success: false, message: "Submission, quiz, or course not found." };
        }
        
        const courseId = submission.quiz.courseId;
        const userId = submission.userId;
        const passed = finalScore >= submission.quiz.passingScore;
        const notificationTitle = passed ? "Quiz Graded: Passed" : "Quiz Graded: Failed";
        const notificationDescription = `Your quiz for "${submission.quiz.course.title}" has been graded. You scored ${finalScore}%.`;

        await prisma.$transaction(async (tx) => {
            await tx.quizSubmission.update({
                where: { id: submissionId },
                data: {
                    score: finalScore,
                    status: SubmissionStatus.COMPLETED,
                    gradedAt: new Date(),
                }
            });
            
            const newAttempt = {
                userId,
                courseId,
                score: finalScore,
                completionDate: new Date()
            };

            // Only mark course as completed if the user passed.
            // Record the attempt — update existing completion record if present instead of failing.
            const existing = await tx.userCompletedCourse.findUnique({
                where: { userId_courseId: { userId, courseId } }
            });

            if (!existing) {
                await tx.userCompletedCourse.create({ data: newAttempt });
            } else {
                await tx.userCompletedCourse.update({
                    where: { userId_courseId: { userId, courseId } },
                    data: { score: finalScore, completionDate: new Date() }
                });
            }
            
            // If user failed, reset module progress to force a retake.
            if (!passed) {
                const moduleIds = submission.quiz.course.modules.map(m => m.id);
                if (moduleIds.length > 0) {
                  await tx.userCompletedModule.deleteMany({
                      where: {
                          userId: submission.userId,
                          moduleId: { in: moduleIds }
                      }
                  });
                }
            }
        });

        await prisma.notification.create({
            data: {
                userId: submission.userId,
                title: notificationTitle,
                description: notificationDescription,
            }
        });

        if (passed && submission.quiz.course.hasCertificate) {
             revalidatePath(`/courses/${submission.quiz.courseId}/certificate`);
        }
        
        revalidatePath(`/courses/${submission.quiz.courseId}`);
        revalidatePath('/admin/grading');
        revalidatePath('/profile');
        revalidatePath('/layout');

        return { success: true };
    } catch (error) {
        console.error("Error grading submission:", error);
        return { success: false, message: 'Failed to finalize grade.' };
    }
}
