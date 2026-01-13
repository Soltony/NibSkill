
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { requirePermission } from '@/lib/authorization'

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  courseIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one course.",
  }),
  hasCertificate: z.boolean().default(false),
})

export async function addLearningPath(values: z.infer<typeof formSchema>) {
    try {
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'learningPaths', 'c'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to create learning paths." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        await prisma.learningPath.create({
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                hasCertificate: validatedFields.data.hasCertificate,
                trainingProviderId: session.trainingProviderId,
                courses: {
                    create: validatedFields.data.courseIds.map((courseId, index) => ({
                        order: index + 1,
                        course: {
                            connect: { id: courseId }
                        }
                    }))
                }
            }
        });

        revalidatePath('/admin/learning-paths');
        return { success: true, message: 'Learning Path added successfully.' }
    } catch (error) {
        console.error("Error adding learning path:", error);
        return { success: false, message: "Failed to add learning path." }
    }
}

export async function updateLearningPath(id: string, values: z.infer<typeof formSchema>) {
    try {
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'learningPaths', 'u'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to update learning paths." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const learningPath = await prisma.learningPath.findUnique({ where: { id } });
        if (!learningPath || learningPath.trainingProviderId !== session.trainingProviderId) {
            return { success: false, message: "Learning path not found or you do not have permission to edit it." };
        }

        await prisma.learningPath.update({
            where: { id },
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                hasCertificate: validatedFields.data.hasCertificate,
                courses: {
                    deleteMany: {},
                    create: validatedFields.data.courseIds.map((courseId, index) => ({
                        order: index + 1,
                        course: {
                            connect: { id: courseId }
                        }
                    }))
                }
            }
        });

        revalidatePath('/admin/learning-paths');
        revalidatePath(`/learning-paths/${id}`);
        return { success: true, message: 'Learning Path updated successfully.' }
    } catch (error) {
        console.error("Error updating learning path:", error);
        return { success: false, message: "Failed to update learning path." }
    }
}


export async function deleteLearningPath(id: string) {
    try {
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'learningPaths', 'd'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to delete learning paths." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const learningPath = await prisma.learningPath.findUnique({ where: { id } });
        if (!learningPath || learningPath.trainingProviderId !== session.trainingProviderId) {
            return { success: false, message: "Learning path not found or you do not have permission to delete it." };
        }

        await prisma.learningPath.delete({
            where: { id }
        });

        revalidatePath('/admin/learning-paths');
        return { success: true, message: 'Learning Path deleted successfully.' }
    } catch (error) {
        console.error("Error deleting learning path:", error);
        return { success: false, message: "Failed to delete learning path." }
    }
}
