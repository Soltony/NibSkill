
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
                        const isMcOrTf = Array.isArray(answer);
                        return {
                            questionId,
                            selectedOptionId: isMcOrTf ? answer[0] : undefined,
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

    