
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'

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

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Question text cannot be empty."),
  type: z.enum(['multiple_choice', 'true_false', 'fill_in_the_blank']),
  options: z.array(z.object({ id: z.string(), text: z.string().min(1, "Option text cannot be empty.") })),
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
            return { success: false, message: "Invalid data provided." }
        }

        const { passingScore, questions } = validatedFields.data;

        // Using a transaction to ensure data integrity
        await prisma.$transaction(async (tx) => {
            // 1. Update passing score
            await tx.quiz.update({
                where: { id: quizId },
                data: { passingScore },
            });

            // 2. Get existing questions and options for this quiz
            const existingQuestions = await tx.question.findMany({
                where: { quizId: quizId },
                include: { options: true },
            });
            const existingQuestionIds = existingQuestions.map(q => q.id);

            // 3. Separate incoming questions into new and existing
            const newQuestions = questions.filter(q => !q.id.startsWith('question-'));
            const updatedQuestions = questions.filter(q => q.id.startsWith('question-'));
            const updatedQuestionIds = updatedQuestions.map(q => q.id);

            // 4. Delete questions that are no longer present
            const questionsToDelete = existingQuestionIds.filter(id => !updatedQuestionIds.includes(id));
            if (questionsToDelete.length > 0) {
                await tx.question.deleteMany({
                    where: { id: { in: questionsToDelete } },
                });
            }

            // 5. Create or update questions
            for (const questionData of questions) {
                const { options, ...qData } = questionData;
                
                const questionInput = {
                    text: qData.text,
                    type: qData.type.replace('-', '_') as any,
                    correctAnswerId: qData.correctAnswerId,
                    quizId: quizId,
                };

                const question = await tx.question.upsert({
                    where: { id: qData.id },
                    update: questionInput,
                    create: { id: qData.id.startsWith('question-') ? undefined : qData.id, ...questionInput },
                });

                if (options.length > 0) {
                     // Delete old options
                    await tx.option.deleteMany({
                        where: { questionId: question.id },
                    });
                    
                    // Create new options
                    await tx.option.createMany({
                        data: options.map(opt => ({
                            id: opt.id.startsWith('option-') ? undefined : opt.id,
                            text: opt.text,
                            questionId: question.id,
                        })),
                    });
                }
            }
        });

        revalidatePath('/admin/quizzes');
        return { success: true, message: 'Quiz updated successfully.' };

    } catch (error) {
        console.error("Error updating quiz:", error);
        return { success: false, message: "Failed to update quiz." };
    }
}
