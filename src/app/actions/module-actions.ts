

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { ModuleType } from '@prisma/client'

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  type: z.enum(["video", "pdf", "slides", "audio"]),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  description: z.string().min(10, "Description is required."),
  content: z.string().min(1, "Content is required.").refine(val => val.startsWith('https://') || val.startsWith('data:'), {
    message: "Content must be a valid URL or a file upload.",
  }),
})

export async function addModule(courseId: string, values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const newModule = await prisma.module.create({
            data: {
                courseId,
                ...validatedFields.data,
                type: validatedFields.data.type as ModuleType,
            }
        });

        revalidatePath(`/admin/courses/${courseId}`);
        return { success: true, message: 'Module added successfully.', data: newModule }
    } catch (error) {
        console.error("Error adding module:", error);
        return { success: false, message: "Failed to add module." }
    }
}

export async function updateModule(id: string, values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        const updatedModule = await prisma.module.update({
            where: { id },
            data: {
                ...validatedFields.data,
                type: validatedFields.data.type as ModuleType,
            }
        });
        
        revalidatePath(`/admin/courses/${updatedModule.courseId}`);
        return { success: true, message: 'Module updated successfully.', data: updatedModule }
    } catch (error) {
        console.error("Error updating module:", error);
        return { success: false, message: "Failed to update module." }
    }
}
