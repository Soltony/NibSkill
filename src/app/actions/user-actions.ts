
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

        const course = await prisma.course.findUnique({
            where: { id: courseId },
            include: { quiz: true, modules: { select: { id: true } } },
        });

        if (!course) {
            return { success: false, message: "Course not found." };
        }
        
        // Record the completion attempt. If a completion record already exists, update it instead
        const existing = await prisma.userCompletedCourse.findUnique({
            where: { userId_courseId: { userId, courseId } }
        });

        if (!existing) {
            await prisma.userCompletedCourse.create({ data: { userId, courseId, score } });
        } else {
            // Update completion date and score. Keep history outside of this model for now.
            await prisma.userCompletedCourse.update({
                where: { userId_courseId: { userId, courseId } },
                data: { score, completionDate: new Date() }
            });
        }
        
        const passed = course.quiz ? score >= course.quiz.passingScore : true;
        
        // If the user failed, reset their module progress to force a retake.
        if (!passed) {
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

        if (passed && course.hasCertificate) {
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
  cookies().set('session', '', { expires: new Date(0) })
}

const profileFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address.").optional().or(z.literal('')),
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
        
        if (email && email !== session.email) {
            const existingUser = await prisma.user.findFirst({ where: { email } });
            if (existingUser && existingUser.id !== session.id) {
                return { success: false, message: "Email is already in use by another account." };
            }
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
