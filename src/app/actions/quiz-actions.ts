
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import type { QuestionType } from '@prisma/client'

const quizFormSchema = z.object({
  courseId: z.string({ required_error: "Please select a course." }),
  passingScore: z.coerce.number().min(0, "Passing score must be at least 0.").max(100, "Passing score cannot exceed 100."),
})

export async function addQuiz(values: z.infer<typeof quizFormSchema>) {
    try {
        const validatedFields = quizFormSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        await prisma.quiz.create({
            data: {
                courseId: validatedFields.data.courseId,
                passingScore: validatedFields.data.passingScore,
            }
        });

        revalidatePath('/admin/quizzes');
        return { success: true, message: 'Quiz created successfully.' }
    } catch (error) {
        console.error("Error creating quiz:", error);
        return { success: false, message: "Failed to create quiz." }
    }
}

const optionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Option text cannot be empty."),
})

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Question text cannot be empty."),
  type: z.enum(['multiple_choice', 'true_false', 'fill_in_the_blank']),
  options: z.array(optionSchema),
  correctAnswerId: z.string({ required_error: "A correct answer is required." }).min(1, "A correct answer is required."),
})

const updateQuizFormSchema = z.object({
  passingScore: z.coerce.number().min(0).max(100),
  questions: z.array(questionSchema),
})


export async function updateQuiz(quizId: string, values: z.infer<typeof updateQuizFormSchema>) {
    try {
        const validatedFields = updateQuizFormSchema.safeParse(values);
        if (!validatedFields.success) {
            console.error("Quiz validation failed:", validatedFields.error.flatten());
            return { success: false, message: "Invalid data provided. Check question and option fields." }
        }

        const { passingScore, questions } = validatedFields.data;

        await prisma.$transaction(async (tx) => {
            // 1. Update the passing score
            await tx.quiz.update({
                where: { id: quizId },
                data: { passingScore },
            });

            const existingQuestions = await tx.question.findMany({
                where: { quizId: quizId },
                select: { id: true }
            });
            const existingQuestionIds = existingQuestions.map(q => q.id);
            const incomingQuestionIds = questions.map(q => q.id);

            // 2. Delete questions that are no longer in the submission
            const questionsToDelete = existingQuestionIds.filter(id => !incomingQuestionIds.includes(id));
            if (questionsToDelete.length > 0) {
                await tx.question.deleteMany({
                    where: { id: { in: questionsToDelete } },
                });
            }

            // 3. Upsert (create or update) questions
            for (const qData of questions) {
                const isNewQuestion = !qData.id.startsWith('question-');
                
                const questionPayload = {
                    text: qData.text,
                    type: qData.type.replace('-', '_') as QuestionType,
                    correctAnswerId: qData.correctAnswerId,
                    quizId: quizId,
                };

                const upsertedQuestion = await tx.question.upsert({
                    where: { id: isNewQuestion ? `__temp_id_${qData.id}` : qData.id }, // Use a non-existent ID for creation
                    create: questionPayload,
                    update: questionPayload,
                });

                // Handle options only for relevant question types
                if (qData.type === 'multiple_choice' || qData.type === 'true-false') {
                    // Delete existing options for this question to ensure a clean slate
                    await tx.option.deleteMany({
                        where: { questionId: upsertedQuestion.id }
                    });

                    // Create the new set of options
                    if (qData.options.length > 0) {
                        await tx.option.createMany({
                            data: qData.options.map(opt => ({
                                id: !opt.id.startsWith('option-') && !opt.id.startsWith('new-o-') ? opt.id : undefined,
                                text: opt.text,
                                questionId: upsertedQuestion.id,
                            }))
                        });
                    }
                }
            }
        });

        revalidatePath('/admin/quizzes');
        revalidatePath(`/admin/quizzes/${quizId}`); // Also revalidate specific quiz if there's a detail page
        return { success: true, message: 'Quiz updated successfully.' };

    } catch (error) {
        console.error("Error updating quiz:", error);
        return { success: false, message: "Failed to update quiz. An unexpected error occurred." };
    }
}
