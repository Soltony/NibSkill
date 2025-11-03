
'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

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
                status: 'PENDING_REVIEW',
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
            include: { quiz: true }
        });
        
        if (!submission) {
            return { success: false, message: "Submission not found." };
        }

        await prisma.quizSubmission.update({
            where: { id: submissionId },
            data: {
                score: finalScore,
                status: 'COMPLETED',
                gradedAt: new Date(),
            }
        });
        
        // After grading, if the user passed, record the course completion
        if (finalScore >= submission.quiz.passingScore) {
            await prisma.userCompletedCourse.upsert({
                where: {
                    userId_courseId: {
                        userId: submission.userId,
                        courseId: submission.quiz.courseId,
                    }
                },
                update: {
                    score: finalScore,
                    completionDate: new Date(),
                },
                create: {
                    userId: submission.userId,
                    courseId: submission.quiz.courseId,
                    score: finalScore,
                }
            });
            revalidatePath(`/courses/${submission.quiz.courseId}`);
        }
        
        revalidatePath('/admin/grading');
        revalidatePath('/profile');
        return { success: true };
    } catch (error) {
        console.error("Error grading submission:", error);
        return { success: false, message: 'Failed to finalize grade.' };
    }
}
