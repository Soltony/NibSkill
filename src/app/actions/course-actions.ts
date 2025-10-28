
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { Currency } from '@prisma/client'
import { getSession } from '@/lib/auth'

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  productId: z.string({ required_error: "Please select a product." }),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  isPaid: z.boolean().default(false),
  price: z.coerce.number().optional(),
  currency: z.nativeEnum(Currency).optional(),
  hasCertificate: z.boolean().default(false),
  status: z.enum(['PENDING', 'PUBLISHED']).optional(),
}).refine(data => !data.isPaid || (data.price !== undefined && data.price > 0), {
    message: "Price must be a positive number for paid courses.",
    path: ["price"],
}).refine(data => !data.isPaid || (data.currency !== undefined), {
    message: "Currency is required for paid courses.",
    path: ["currency"],
});

export async function addCourse(values: z.infer<typeof formSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized operation." };
        }

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const product = await prisma.product.findUnique({
            where: { id: validatedFields.data.productId }
        });

        if (!product) {
            return { success: false, message: "Associated product not found." }
        }

        await prisma.course.create({
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                productId: validatedFields.data.productId,
                isPaid: validatedFields.data.isPaid,
                price: validatedFields.data.isPaid ? validatedFields.data.price : null,
                currency: validatedFields.data.isPaid ? validatedFields.data.currency : null,
                hasCertificate: validatedFields.data.hasCertificate,
                imageUrl: product.imageUrl,
                imageHint: product.imageHint,
                imageDescription: product.description, // Use product description as a fallback for image description
                status: 'PENDING',
                trainingProviderId: session.trainingProviderId,
            }
        });

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        return { success: true, message: 'Course submitted for approval.' }
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
        
        const product = await prisma.product.findUnique({
            where: { id: validatedFields.data.productId }
        });

        if (!product) {
            return { success: false, message: "Associated product not found." }
        }

        await prisma.course.update({
            where: { id },
            data: {
                title: validatedFields.data.title,
                description: validatedFields.data.description,
                productId: validatedFields.data.productId,
                isPaid: validatedFields.data.isPaid,
                price: validatedFields.data.isPaid ? validatedFields.data.price : null,
                currency: validatedFields.data.isPaid ? validatedFields.data.currency : null,
                hasCertificate: validatedFields.data.hasCertificate,
                imageUrl: product.imageUrl,
                imageHint: product.imageHint,
                imageDescription: product.description,
                status: validatedFields.data.status,
            }
        });

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        revalidatePath(`/admin/courses/${id}`);
        revalidatePath(`/courses/${id}`);
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

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        return { success: true, message: 'Course deleted successfully.' }
    } catch (error) {
        console.error("Error deleting course:", error);
        return { success: false, message: "Failed to delete course." }
    }
}

export async function publishCourse(id: string) {
    try {
        await prisma.course.update({
            where: { id },
            data: { status: 'PUBLISHED' }
        });

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        return { success: true, message: 'Course published successfully.' }
    } catch (error) {
        console.error("Error publishing course:", error);
        return { success: false, message: "Failed to publish course." }
    }
}
