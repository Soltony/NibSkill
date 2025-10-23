
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import type { QuestionType, QuizType } from '@prisma/client'

const quizFormSchema = z.object({
  courseId: z.string({ required_error: "Please select a course." }),
  passingScore: z.coerce.number().min(0, "Passing score must be at least 0.").max(100, "Passing score cannot exceed 100."),
  timeLimit: z.coerce.number().min(0, "Time limit must be a positive number or 0 for no limit."),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"]),
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
                timeLimit: validatedFields.data.timeLimit,
                quizType: validatedFields.data.quizType as QuizType,
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
  type: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'FILL_IN_THE_BLANK', 'SHORT_ANSWER']),
  options: z.array(optionSchema),
  correctAnswerId: z.string().min(1, "A correct answer is required."),
})

const updateQuizFormSchema = z.object({
  passingScore: z.coerce.number().min(0).max(100),
  timeLimit: z.coerce.number().min(0),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"]),
  questions: z.array(
    z.object({
      id: z.string().optional(),
      text: z.string().min(1, "Question text cannot be empty."),
      type: z.string(), // Accept string first
      options: z.array(optionSchema),
      correctAnswerId: z.string().min(1, "A correct answer is required."),
    }).transform(data => ({
      ...data,
      type: data.type.toUpperCase() as QuestionType, // Then transform to uppercase enum
    })).pipe(questionSchema) // And finally validate against the schema with the now-uppercase type
  ),
});


export async function updateQuiz(quizId: string, values: z.infer<typeof updateQuizFormSchema>) {
    try {
        const validatedFields = updateQuizFormSchema.safeParse(values);
        if (!validatedFields.success) {
            console.error("Quiz validation failed:", validatedFields.error.flatten());
            return { success: false, message: "Invalid data provided. Check question and option fields." }
        }

        const { passingScore, timeLimit, quizType, questions: incomingQuestions } = validatedFields.data;
        const requiresManualGrading = quizType === 'CLOSED_LOOP' && incomingQuestions.some(q => q.type === 'FILL_IN_THE_BLANK' || q.type === 'SHORT_ANSWER');

        await prisma.$transaction(async (tx) => {
            await tx.quiz.update({
                where: { id: quizId },
                data: { passingScore, timeLimit, quizType, requiresManualGrading },
            });

            const existingQuestionIds = (await tx.question.findMany({ where: { quizId }, select: { id: true } })).map(q => q.id);
            const incomingQuestionIds = incomingQuestions.map(q => q.id).filter((id): id is string => !!id);
            
            const questionIdsToDelete = existingQuestionIds.filter(id => !incomingQuestionIds.includes(id));
            if (questionIdsToDelete.length > 0) {
                await tx.question.deleteMany({ where: { id: { in: questionIdsToDelete } } });
            }

            for (const qData of incomingQuestions) {
                const isNewQuestion = !qData.id;
                
                const questionPayload = {
                    text: qData.text,
                    type: qData.type,
                };

                if (isNewQuestion) {
                    if (qData.type === 'FILL_IN_THE_BLANK' || qData.type === 'SHORT_ANSWER') {
                        await tx.question.create({
                            data: {
                                ...questionPayload,
                                quizId: quizId,
                                correctAnswerId: qData.correctAnswerId, // The answer text itself
                            }
                        });
                    } else { 
                        const tempQuestion = await tx.question.create({
                            data: { ...questionPayload, quizId: quizId, correctAnswerId: 'placeholder' }
                        });
                        
                        const createdOptions = await Promise.all(qData.options.map(opt => 
                            tx.option.create({
                                data: { text: opt.text, questionId: tempQuestion.id }
                            })
                        ));
                        
                        const correctOption = createdOptions.find(opt => opt.text === qData.correctAnswerId);
                        if (!correctOption) throw new Error(`Correct answer "${qData.correctAnswerId}" not found among new options for question "${qData.text}"`);

                        await tx.question.update({
                            where: { id: tempQuestion.id },
                            data: { correctAnswerId: correctOption.id }
                        });
                    }
                } else { // This is an existing question
                    await tx.question.update({
                        where: { id: qData.id },
                        data: questionPayload,
                    });

                     if (qData.type === 'MULTIPLE_CHOICE' || qData.type === 'TRUE_FALSE') {
                        await tx.option.deleteMany({ where: { questionId: qData.id } });
                        
                        const createdOptions = await Promise.all(qData.options.map(opt => 
                            tx.option.create({ data: { text: opt.text, questionId: qData.id! } })
                        ));
                        
                        const correctOption = createdOptions.find(opt => opt.text === qData.correctAnswerId);
                        if (!correctOption) throw new Error(`Correct answer text "${qData.correctAnswerId}" not found for existing question "${qData.text}"`);

                        await tx.question.update({
                            where: { id: qData.id },
                            data: { correctAnswerId: correctOption.id }
                        });
                    } else if (qData.type === 'FILL_IN_THE_BLANK' || qData.type === 'SHORT_ANSWER') {
                        await tx.option.deleteMany({ where: { questionId: qData.id } });
                        await tx.question.update({
                            where: { id: qData.id },
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
                    orderBy: { createdAt: 'asc' },
                    include: {
                        options: {
                            orderBy: { createdAt: 'asc' }
                        }
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
