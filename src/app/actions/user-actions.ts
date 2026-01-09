

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { sendEmail, getLoginCredentialsEmailTemplate } from '@/lib/email'
import { generateSecurePassword } from '@/lib/crypto'

const completeCourseSchema = z.object({
  courseId: z.string(),
  score: z.number().min(0).max(100),
})

export async function resendCredentialsEmail(userId: string) {
    try {
        const session = await getSession();
        if (!session) {
            return { success: false, message: "Not authenticated." };
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.email) {
            return { success: false, message: "User not found or has no email address." };
        }
        
        // Security check: ensure admin has authority over the user
        if (session.role.name !== 'Super Admin' && user.trainingProviderId !== session.trainingProviderId) {
             return { success: false, message: "You do not have permission to manage this user." };
        }

        const newPassword = generateSecurePassword();
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword, passwordChangeRequired: true }
        });
        
        const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : 'http://localhost:3000/login';

        await sendEmail({
            to: user.email,
            subject: 'Your NIB Training Account Credentials',
            html: getLoginCredentialsEmailTemplate(user.phoneNumber || user.email, newPassword, loginUrl)
        });

        return { success: true, message: `A new password has been sent to ${user.email}.` };

    } catch (error) {
        console.error("Error resending credentials:", error);
        return { success: false, message: 'Failed to resend credentials email.' };
    }
}


export async function completeCourse(values: z.infer<typeof completeCourseSchema>) {
    try {
        const session = await getSession();
        if (!session?.id) {
          return { success: false, message: "User not authenticated." };
        }

        const validatedFields = completeCourseSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { courseId, score } = validatedFields.data;
        const userId = session.id;

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { quiz: true, modules: { select: { id: true }} },
        });

        if (!course) {
            return { success: false, message: "Course not found." };
        }
        
        const passed = course.quiz ? score >= course.quiz.passingScore : true;
        
        // Record the attempt. If a completion record already exists, update it.
        // If not, create a new one.
        const existingAttempt = await prisma.userCompletedCourse.findFirst({
            where: { userId: userId, courseId: courseId },
        });

        if (existingAttempt) {
            await prisma.userCompletedCourse.update({
                where: { id: existingAttempt.id },
                data: { score: score, completionDate: new Date() }
            });
        } else {
            await prisma.userCompletedCourse.create({
                data: {
                    userId: userId,
                    courseId: courseId,
                    score: score,
                    completionDate: new Date(),
                },
            });
        }
        
        // If the user failed and has attempts left, reset their module progress to force a retake.
        const attemptsUsed = await prisma.userCompletedCourse.count({ where: { userId, courseId }});
        const maxAttempts = course.quiz?.maxAttempts ?? 0;
        
        if (!passed && (maxAttempts === 0 || attemptsUsed < maxAttempts)) {
            const moduleIds = course.modules.map(m => m.id);
            if (moduleIds.length > 0) {
                await prisma.userCompletedModule.deleteMany({
                    where: {
                        userId: userId,
                        moduleId: { in: moduleIds }
                    }
                });
            }
        }
        
        const notificationTitle = passed ? "Quiz Graded: Passed" : "Quiz Graded: Failed";
        const notificationDescription = `Your quiz for "${course.title}" has been graded. You scored ${score}%.`;

        await prisma.notification.create({
            data: {
                userId: userId,
                title: notificationTitle,
                description: notificationDescription,
            }
        });
        
        // Check if the course is part of a learning path
        const isCourseInLearningPath = await prisma.learningPathCourse.count({
            where: { courseId: courseId }
        }) > 0;

        // Only revalidate for a certificate if the user passed, the course has a cert,
        // AND the course is NOT part of a learning path.
        if (passed && course.hasCertificate && !isCourseInLearningPath) {
            revalidatePath(`/courses/${courseId}/certificate`);
        }

        revalidatePath('/profile');
        revalidatePath(`/courses/${courseId}`); // Revalidate to show new progress
        revalidatePath('/dashboard');
        revalidatePath('/layout'); // Revalidate layout to update notifications
        
        return { success: true, message: 'Course completion recorded.' }
    } catch (error) {
        console.error("Error recording course completion:", error);
        return { success: false, message: "Failed to record course completion." }
    }
}


export async function logout() {
  const cookieStore = cookies();
  cookieStore.delete('refresh_token');
  // You might also want to explicitly revoke the token in the database
  // by calling a new API endpoint like /api/auth/logout
}

const phoneValidation = z.string().optional().refine(val => !val || (val.startsWith('09') && val.length === 10 && /^\d+$/.test(val)) || (val.startsWith('251') && val.length === 12 && /^\d+$/.test(val)), {
    message: "Phone number must be 10 digits starting with 09, or 12 digits starting with 251."
});

const profileFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address.").optional().or(z.literal('')),
    phoneNumber: phoneValidation,
})

export async function updateUserProfile(values: z.infer<typeof profileFormSchema>) {
    const session = await getSession();
    if (!session) {
        return { success: false, message: "Not authenticated." };
    }

    try {
        const validatedFields = profileFormSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." };
        }

        const { name, email, phoneNumber } = validatedFields.data;
        
        const existingUserWithEmail = email ? await prisma.user.findFirst({ where: { email, id: { not: session.id } } }) : null;
        if (existingUserWithEmail) {
            return { success: false, message: "Email is already in use by another account." };
        }

        const existingUserWithPhone = phoneNumber ? await prisma.user.findFirst({ where: { phoneNumber, id: { not: session.id } } }) : null;
        if (existingUserWithPhone) {
            return { success: false, message: "Phone number is already in use by another account." };
        }

        await prisma.user.update({
            where: { id: session.id },
            data: {
                name,
                email: email || null,
                phoneNumber: phoneNumber || null,
            }
        });

        revalidatePath('/profile');
        
        if (email && email !== session.email) {
             // Let's not force re-login for just an email change if phone is primary.
        }
        
        return { success: true, message: 'Profile updated successfully.' };

    } catch (error) {
        console.error("Error updating profile:", error);
        if ((error as any).code === 'P2002') { // Unique constraint violation
            return { success: false, message: "A user with that email or phone number already exists." };
        }
        return { success: false, message: "Failed to update profile." };
    }
}

const toggleModuleSchema = z.object({
  moduleId: z.string(),
  completed: z.boolean(),
});

export async function toggleModuleCompletion(courseId: string, values: z.infer<typeof toggleModuleSchema>) {
    const session = await getSession();
    if (!session) {
        return { success: false, message: "Not authenticated." };
    }
    
    const validatedFields = toggleModuleSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: "Invalid data." };
    }
    
    const { moduleId, completed } = validatedFields.data;
    const userId = session.id;

    try {
        if (completed) {
            await prisma.userCompletedModule.create({
                data: {
                    userId,
                    moduleId
                }
            });
        } else {
            await prisma.userCompletedModule.delete({
                where: {
                    userId_moduleId: {
                        userId,
                        moduleId
                    }
                }
            });
        }
        revalidatePath(`/courses/${courseId}`);
        return { success: true };
    } catch (error) {
        // Ignore errors if record already exists/doesn't exist, which can happen with rapid toggling
        if ((error as any).code === 'P2002' || (error as any).code === 'P2025') {
            return { success: true };
        }
        console.error("Error toggling module completion:", error);
        return { success: false, message: "Failed to update progress." };
    }
}
