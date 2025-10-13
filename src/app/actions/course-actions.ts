
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  productId: z.string({ required_error: "Please select a product." }),
  description: z.string().min(10, "Description must be at least 10 characters long."),
})

export async function addCourse(values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        await prisma.course.create({
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                productId: validatedFields.data.productId,
                // These are placeholders, a real app would have more logic
                imageUrl: `https://picsum.photos/seed/${Math.random()}/600/400`,
                imageDescription: 'Placeholder image',
                imageHint: 'placeholder',
            }
        });

        revalidatePath('/admin/courses');
        return { success: true, message: 'Course added successfully.' }
    } catch (error) {
        console.error("Error adding course:", error);
        return { success: false, message: "Failed to add course." }
    }
}

export async function updateCourse(id: string, values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        await prisma.course.update({
            where: { id },
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                productId: validatedFields.data.productId,
            }
        });

        revalidatePath('/admin/courses');
        return { success: true, message: 'Course updated successfully.' }
    } catch (error) {
        console.error("Error updating course:", error);
        return { success: false, message: "Failed to update course." }
    }
}

export async function deleteCourse(id: string) {
    try {
        await prisma.course.delete({
            where: { id }
        });

        revalidatePath('/admin/courses');
        return { success: true, message: 'Course deleted successfully.' }
    } catch (error) {
        console.error("Error deleting course:", error);
        return { success: false, message: "Failed to delete course." }
    }
}
