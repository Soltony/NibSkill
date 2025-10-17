
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
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

        revalidatePath('/profile');
        revalidatePath(`/courses/${courseId}/certificate`);
        return { success: true, message: 'Course completion recorded.' }
    } catch (error) {
        console.error("Error recording course completion:", error);
        return { success: false, message: "Failed to record course completion." }
    }
}


export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
  redirect('/login')
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
        
        return { success: true, message: 'Profile updated successfully. Please log in again.' };

    } catch (error) {
        console.error("Error updating profile:", error);
        return { success: false, message: "Failed to update profile." };
    }
}
