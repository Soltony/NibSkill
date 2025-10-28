
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

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
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized operation." };
        }

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
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
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
