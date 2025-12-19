
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import type { QuestionType, QuizType, RequestStatus } from '@prisma/client'

const quizFormSchema = z.object({
  courseId: z.string({ required_error: "Please select a course." }),
  passingScore: z.coerce.number().min(0, "Passing score must be at least 0.").max(100, "Passing score cannot exceed 100."),
  timeLimit: z.coerce.number().min(0, "Time limit must be a positive number or 0 for no limit."),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"]),
  maxAttempts: z.coerce.number().min(0, "Max attempts must be a positive number or 0 for unlimited."),
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
                maxAttempts: validatedFields.data.maxAttempts,
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
  weight: z.coerce.number().min(0.1, "Weight must be greater than 0."),
})

const updateQuizFormSchema = z.object({
  passingScore: z.coerce.number().min(0).max(100),
  timeLimit: z.coerce.number().min(0),
  maxAttempts: z.coerce.number().min(0),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"]),
  questions: z.array(questionSchema),
});


export async function updateQuiz(quizId: string, values: z.infer<typeof updateQuizFormSchema>) {
    try {
        const transformedValues = {
            ...values,
            questions: values.questions.map(q => ({
                ...q,
                type: q.type.toUpperCase() as QuestionType,
            }))
        };

        const validatedFields = updateQuizFormSchema.safeParse(transformedValues);
        if (!validatedFields.success) {
            console.error("Quiz validation failed:", validatedFields.error.flatten());
            return { success: false, message: "Invalid data provided. Check question and option fields." }
        }

        const { passingScore, timeLimit, quizType, questions: incomingQuestions, maxAttempts } = validatedFields.data;
        const requiresManualGrading = quizType === 'CLOSED_LOOP' && incomingQuestions.some(q => q.type === 'FILL_IN_THE_BLANK' || q.type === 'SHORT_ANSWER');

        await prisma.$transaction(async (tx) => {
            await tx.quiz.update({
                where: { id: quizId },
                data: { passingScore, timeLimit, quizType, requiresManualGrading, maxAttempts },
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
                    weight: qData.weight,
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

export async function requestQuizReset(userId: string, courseId: string) {
    try {
        const existingRequest = await prisma.resetRequest.findFirst({
            where: {
                userId,
                courseId,
                status: 'PENDING'
            }
        });

        if (existingRequest) {
            return { success: false, message: "You already have a pending reset request for this course." };
        }

        const newRequest = await prisma.resetRequest.create({
            data: {
                userId,
                courseId,
                status: 'PENDING'
            },
            include: {
                user: true,
                course: {
                    include: {
                        trainingProvider: true
                    }
                }
            }
        });

        if (newRequest.course.trainingProviderId) {
            const admins = await prisma.user.findMany({
                where: {
                    trainingProviderId: newRequest.course.trainingProviderId,
                    roles: {
                        some: {
                            role: {
                                name: 'Admin'
                            }
                        }
                    }
                },
                select: { id: true }
            });

            if (admins.length > 0) {
                await prisma.notification.createMany({
                    data: admins.map(admin => ({
                        userId: admin.id,
                        title: "New Quiz Reset Request",
                        description: `${newRequest.user.name} has requested a quiz reset for the course "${newRequest.course.title}".`
                    }))
                });
            }
        }
        
        revalidatePath(`/courses/${courseId}`);
        revalidatePath('/admin/settings');
        revalidatePath('/layout');

        return { success: true, message: 'Your request to reset quiz attempts has been submitted.' };

    } catch (error) {
        console.error("Error requesting quiz reset:", error);
        return { success: false, message: 'Failed to submit reset request.' };
    }
}

export async function approveResetRequest(requestId: string) {
    try {
        const request = await prisma.resetRequest.findUnique({
            where: { id: requestId },
            include: {
                user: true,
                course: true
            }
        });

        if (!request) {
            return { success: false, message: "Request not found." };
        }

        await prisma.$transaction([
            prisma.userCompletedCourse.deleteMany({
                where: {
                    userId: request.userId,
                    courseId: request.courseId,
                }
            }),
            prisma.resetRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' }
            }),
             prisma.notification.create({
                data: {
                    userId: request.userId,
                    title: "Request Approved",
                    description: `Your request to reset the quiz for "${request.course.title}" has been approved.`
                }
            })
        ]);

        revalidatePath('/admin/settings');
        revalidatePath(`/courses/${request.courseId}`);
        return { success: true, message: 'Request approved. User attempts have been reset.' };

    } catch (error) {
        console.error("Error approving reset request:", error);
        return { success: false, message: 'Failed to approve request.' };
    }
}

export async function rejectResetRequest(requestId: string) {
    try {
       const request = await prisma.resetRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
            include: {
                user: true,
                course: true
            }
        });

        await prisma.notification.create({
            data: {
                userId: request.userId,
                title: "Request Rejected",
                description: `Your request to reset the quiz for "${request.course.title}" has been rejected.`
            }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'Request has been rejected.' };

    } catch (error) {
        console.error("Error rejecting reset request:", error);
        return { success: false, message: 'Failed to reject request.' };
    }
}
