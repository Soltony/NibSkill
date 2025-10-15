
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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
