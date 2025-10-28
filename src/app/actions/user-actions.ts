
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

const completeCourseSchema = z.object({
  userId: z.string(),
  courseId: z.string(),
  score: z.number().min(0).max(100),
})

export async function completeCourse(values: z.infer<typeof completeCourseSchema>) {
    try {
        const validatedFields = completeCourseSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { userId, courseId, score } = validatedFields.data;

        // Use upsert to handle cases where the user might retake a quiz
        await prisma.userCompletedCourse.upsert({
            where: {
                userId_courseId: {
                    userId,
                    courseId,
                }
            },
            update: {
                score,
                completionDate: new Date(),
            },
            create: {
                userId,
                courseId,
                score,
            }
        });

        const course = await prisma.course.findUnique({ where: { id: courseId } });
        if (course?.hasCertificate) {
            revalidatePath(`/courses/${courseId}/certificate`);
        }

        revalidatePath('/profile');
        
        return { success: true, message: 'Course completion recorded.' }
    } catch (error) {
        console.error("Error recording course completion:", error);
        return { success: false, message: "Failed to record course completion." }
    }
}


export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
}

const profileFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    phoneNumber: z.string().optional(),
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
        
        if (email !== session.email) {
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser && existingUser.id !== session.id) {
                return { success: false, message: "Email is already in use by another account." };
            }
        }

        await prisma.user.update({
            where: { id: session.id },
            data: {
                name,
                email,
                phoneNumber: phoneNumber || null,
            }
        });

        revalidatePath('/profile');
        
        // If email has changed, user needs to log in again with new email.
        // We will clear the session cookie to force re-login.
        if (email !== session.email) {
             cookies().set('session', '', { expires: new Date(0) });
             return { success: true, message: 'Profile updated. Please log in again with your new email.' };
        }
        
        return { success: true, message: 'Profile updated successfully.' };

    } catch (error) {
        console.error("Error updating profile:", error);
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
