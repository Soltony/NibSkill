
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  imageUrl: z.string().url("A valid image data URI is required."),
  imageHint: z.string().optional(),
})

export async function addProduct(values: z.infer<typeof productSchema>) {
  try {
    const session = await getSession();
    if (!session || !session.trainingProviderId) {
      return { success: false, message: "Unauthorized operation." };
    }

    const validatedFields = productSchema.safeParse(values)

    if (!validatedFields.success) {
      return { success: false, message: 'Invalid data provided.' }
    }

    await prisma.product.create({
      data: {
        name: validatedFields.data.name,
        description: validatedFields.data.description,
        imageUrl: validatedFields.data.imageUrl,
        imageHint: validatedFields.data.imageHint || 'custom image',
        trainingProviderId: session.trainingProviderId,
      },
    })

    revalidatePath('/admin/products')
    return { success: true, message: 'Product added successfully.' }
  } catch (error) {
    console.error('Error adding product:', error)
    return { success: false, message: 'Failed to add product.' }
  }
}

export async function updateProduct(id: string, values: z.infer<typeof productSchema>) {
   try {
    const validatedFields = productSchema.safeParse(values)

    if (!validatedFields.success) {
      return { success: false, message: 'Invalid data provided.' }
    }

    await prisma.product.update({
      where: { id },
      data: {
        name: validatedFields.data.name,
        description: validatedFields.data.description,
        imageUrl: validatedFields.data.imageUrl,
        imageHint: validatedFields.data.imageHint || 'custom image',
      },
    })

    revalidatePath('/admin/products')
    revalidatePath(`/admin/courses`); // To update product name if course is associated
    return { success: true, message: 'Product updated successfully.' }
  } catch (error) {
    console.error('Error updating product:', error)
    return { success: false, message: 'Failed to update product.' }
  }
}
