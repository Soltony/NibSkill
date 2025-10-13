
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { PlaceHolderImages } from '@/lib/placeholder-images';

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
})

export async function addProduct(values: z.infer<typeof productSchema>) {
  try {
    const validatedFields = productSchema.safeParse(values)

    if (!validatedFields.success) {
      return { success: false, message: 'Invalid data provided.' }
    }
    
    // In a real app, you'd probably upload an image.
    // Here we'll just cycle through the placeholders.
    const imageIndex = Math.floor(Math.random() * PlaceHolderImages.length);
    const randomImage = PlaceHolderImages[imageIndex];

    await prisma.product.create({
      data: {
        name: validatedFields.data.name,
        description: validatedFields.data.description,
        imageUrl: randomImage.imageUrl,
        imageDescription: randomImage.description,
        imageHint: randomImage.imageHint,
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
      },
    })

    revalidatePath('/admin/products')
    return { success: true, message: 'Product updated successfully.' }
  } catch (error) {
    console.error('Error updating product:', error)
    return { success: false, message: 'Failed to update product.' }
  }
}
