
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

        const submission = await prisma.quizSubmission.create({
            data: {
                userId,
                quizId,
                status: 'PENDING_REVIEW',
                answers: {
                    create: Object.entries(answers).map(([questionId, answer]) => {
                        const isMcOrTf = Array.isArray(answer) || typeof answer === 'string' && answer.startsWith('opt_');
                        return {
                            questionId,
                            selectedOptionId: isMcOrTf ? (Array.isArray(answer) ? answer[0] : answer) : undefined,
                            answerText: !isMcOrTf ? answer as string : undefined,
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
        await prisma.quizSubmission.update({
            where: { id: submissionId },
            data: {
                score: finalScore,
                status: 'COMPLETED',
                gradedAt: new Date(),
            }
        });
        
        revalidatePath('/admin/grading');
        return { success: true };
    } catch (error) {
        console.error("Error grading submission:", error);
        return { success: false, message: 'Failed to finalize grade.' };
    }
}
