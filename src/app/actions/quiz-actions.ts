
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
  correctAnswerId: z.string().min(1, "A correct answer is required."),
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

        const { passingScore, questions: incomingQuestions } = validatedFields.data;

        await prisma.$transaction(async (tx) => {
            await tx.quiz.update({
                where: { id: quizId },
                data: { passingScore },
            });

            const existingQuestionIds = (await tx.question.findMany({ where: { quizId }, select: { id: true } })).map(q => q.id);
            const incomingQuestionIds = incomingQuestions.map(q => q.id).filter(id => !id.startsWith('new-q-'));

            const questionIdsToDelete = existingQuestionIds.filter(id => !incomingQuestionIds.includes(id));
            if (questionIdsToDelete.length > 0) {
                await tx.question.deleteMany({ where: { id: { in: questionIdsToDelete } } });
            }

            for (const qData of incomingQuestions) {
                const isNewQuestion = qData.id.startsWith('new-q-');
                
                if (isNewQuestion) {
                    const questionPayload = {
                        text: qData.text,
                        type: qData.type as QuestionType,
                    };
                    
                    if (qData.type === 'fill_in_the_blank') {
                        await tx.question.create({
                            data: {
                                ...questionPayload,
                                quizId: quizId,
                                correctAnswerId: qData.correctAnswerId,
                            }
                        });
                    } else { // multiple_choice or true_false
                        const newQuestion = await tx.question.create({
                           data: {
                               ...questionPayload,
                               quizId: quizId,
                               correctAnswerId: 'placeholder', // Temporary value
                           }
                        });
                        
                        const optionsToCreate = qData.options.map(opt => ({
                            text: opt.text,
                            questionId: newQuestion.id,
                        }));
                        
                        const createdOptions = await tx.option.createManyAndReturn({
                            data: optionsToCreate,
                        });

                        const correctOption = createdOptions.find(opt => opt.text === qData.correctAnswerId);

                        if (!correctOption) {
                            throw new Error(`Correct answer "${qData.correctAnswerId}" not found in created options for question "${qData.text}"`);
                        }

                        await tx.question.update({
                            where: { id: newQuestion.id },
                            data: { correctAnswerId: correctOption.id }
                        });
                    }

                } else { // It's an existing question
                    const questionPayload = {
                        text: qData.text,
                        type: qData.type as QuestionType,
                    };

                    if (qData.type === 'fill_in_the_blank') {
                        await tx.question.update({
                            where: { id: qData.id },
                            data: {
                                ...questionPayload,
                                correctAnswerId: qData.correctAnswerId,
                            }
                        });
                         await tx.option.deleteMany({ where: { questionId: qData.id } });

                    } else { // multiple_choice or true_false
                        await tx.question.update({
                            where: { id: qData.id },
                            data: questionPayload,
                        });
                        
                        await tx.option.deleteMany({ where: { questionId: qData.id } });
                        
                        const optionsToCreate = qData.options.map(opt => ({
                            text: opt.text,
                            questionId: qData.id
                        }));
                        
                        const createdOptions = await tx.option.createManyAndReturn({
                            data: optionsToCreate,
                        });

                        const correctOption = createdOptions.find(opt => opt.text === qData.correctAnswerId);

                         if (!correctOption) {
                            throw new Error(`Correct answer "${qData.correctAnswerId}" not found in created options for question "${qData.text}"`);
                        }
                        
                        await tx.question.update({
                            where: { id: qData.id },
                            data: { correctAnswerId: correctOption.id }
                        });
                    }
                }
            }
        });

        revalidatePath('/admin/quizzes');
        revalidatePath(`/admin/quizzes/${quizId}`);
        return { success: true, message: 'Quiz updated successfully.' };

    } catch (error: any) {
        console.error("Error updating quiz:", error);
        return { success: false, message: `Failed to update quiz: ${error.message}` };
    }
}
