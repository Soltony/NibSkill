
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

        await prisma.quizSubmission.update({
            where: { id: submissionId },
            data: {
                score: finalScore,
                status: 'COMPLETED',
                gradedAt: new Date(),
            }
        });
        
        const courseId = submission.quiz.courseId;
        const userId = submission.userId;
        
        const newAttempt = {
            userId,
            courseId,
            score: finalScore,
            completionDate: new Date()
        };

        const existingCompletion = await prisma.userCompletedCourse.findUnique({
            where: {
                userId_courseId: { userId, courseId }
            }
        });

        if (existingCompletion) {
            await prisma.userCompletedCourse.update({
                where: { userId_courseId: { userId, courseId } },
                data: { score: finalScore, completionDate: new Date() }
            });
        } else {
             await prisma.userCompletedCourse.create({ data: newAttempt });
        }
        
        const allAttempts = await prisma.userCompletedCourse.findMany({ where: { userId, courseId }});

        // Logic for resetting progress
        const passed = finalScore >= submission.quiz.passingScore;
        const maxAttempts = submission.quiz.maxAttempts ?? 0;
        
        if (!passed && maxAttempts > 0) {
             if (allAttempts.length < maxAttempts) {
                // User failed and has attempts left. Reset module progress.
                const moduleIds = submission.quiz.course.modules.map(m => m.id);
                if (moduleIds.length > 0) {
                  await prisma.userCompletedModule.deleteMany({
                      where: {
                          userId: submission.userId,
                          moduleId: { in: moduleIds }
                      }
                  });
                }
            }
        }

        // Create a notification for the user
        await prisma.notification.create({
            data: {
                userId: submission.userId,
                title: "Quiz Graded",
                description: `Your quiz for "${submission.quiz.course.title}" has been graded. You ${passed ? 'passed' : 'failed'} with a score of ${finalScore}%.`,
            }
        });

        // Revalidate paths to update UI
        if (passed && submission.quiz.course.hasCertificate) {
             revalidatePath(`/courses/${submission.quiz.courseId}/certificate`);
        }
        revalidatePath(`/courses/${submission.quiz.courseId}`);
        revalidatePath('/admin/grading');
        revalidatePath('/profile');
        revalidatePath('/layout'); // To update notification bell

        return { success: true };
    } catch (error) {
        console.error("Error grading submission:", error);
        return { success: false, message: 'Failed to finalize grade.' };
    }
}
