
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
  id: z.string().optional(),
  text: z.string().min(1, "Option text cannot be empty."),
})

const questionSchema = z.object({
  id: z.string().optional(),
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
            const incomingQuestionIds = incomingQuestions.map(q => q.id).filter((id): id is string => !!id);

            // Delete questions that are no longer in the submission
            const questionIdsToDelete = existingQuestionIds.filter(id => !incomingQuestionIds.includes(id));
            if (questionIdsToDelete.length > 0) {
                await tx.question.deleteMany({ where: { id: { in: questionIdsToDelete } } });
            }

            for (const qData of incomingQuestions) {
                const isNewQuestion = !qData.id;
                
                const questionPayload = {
                    text: qData.text,
                    type: qData.type as QuestionType,
                };
                
                let upsertedQuestion;

                if (isNewQuestion) {
                     if (qData.type === 'fill_in_the_blank') {
                        upsertedQuestion = await tx.question.create({
                            data: {
                                ...questionPayload,
                                quizId: quizId,
                                correctAnswerId: qData.correctAnswerId,
                            }
                        });
                    } else {
                        const questionWithoutCorrectAnswer = await tx.question.create({
                            data: {
                                ...questionPayload,
                                quizId: quizId,
                                correctAnswerId: 'placeholder' // Temp value
                            }
                        });

                        const createdOptions = await tx.option.createManyAndReturn({
                           data: qData.options.map(opt => ({ text: opt.text, questionId: questionWithoutCorrectAnswer.id }))
                        });

                        const correctOption = createdOptions.find(opt => opt.text === qData.correctAnswerId);
                        if (!correctOption) {
                            throw new Error(`Correct answer "${qData.correctAnswerId}" not found for new question "${qData.text}"`);
                        }
                        
                        upsertedQuestion = await tx.question.update({
                            where: { id: questionWithoutCorrectAnswer.id },
                            data: { correctAnswerId: correctOption.id }
                        });
                    }
                } else { // This is an existing question
                    upsertedQuestion = await tx.question.update({
                        where: { id: qData.id },
                        data: questionPayload,
                    });

                     if (qData.type === 'multiple_choice' || qData.type === 'true_false') {
                        await tx.option.deleteMany({ where: { questionId: upsertedQuestion.id } });
                        
                        const createdOptions = await tx.option.createManyAndReturn({
                            data: qData.options.map(opt => ({
                                text: opt.text,
                                questionId: upsertedQuestion.id
                            })),
                        });

                        const correctOption = createdOptions.find(opt => opt.text === qData.correctAnswerId);
                        
                        if (!correctOption) {
                            throw new Error(`Correct answer "${qData.correctAnswerId}" not found for question "${qData.text}"`);
                        }

                        await tx.question.update({
                            where: { id: upsertedQuestion.id },
                            data: { correctAnswerId: correctOption.id }
                        });
                    } else if (qData.type === 'fill_in_the_blank') {
                        await tx.option.deleteMany({ where: { questionId: upsertedQuestion.id } });
                        await tx.question.update({
                            where: { id: upsertedQuestion.id },
                            data: { correctAnswerId: qData.correctAnswerId }
                        });
                    }
                }
            }
        });
        
        revalidatePath('/admin/quizzes');
        revalidatePath(`/admin/quizzes/${quizId}`);

        const updatedQuiz = await prisma.quiz.findUnique({
            where: { id: quizId },
            include: {
                questions: {
                    include: {
                        options: true
                    }
                }
            }
        });

        return { success: true, message: 'Quiz updated successfully.', data: updatedQuiz };

    } catch (error: any) {
        console.error("Error updating quiz:", error);
        return { success: false, message: `Failed to update quiz: ${error.message}` };
    }
}
