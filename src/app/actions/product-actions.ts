
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { requirePermission } from '@/lib/authorization'

const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  imageUrl: z.string().url("A valid image URL or data URI is required.").refine(
    (val) => !val.startsWith('data:') || val.startsWith('data:image/'),
    "Uploaded file must be an image."
  ),
  imageHint: z.string().optional(),
})

export async function addProduct(values: z.infer<typeof productSchema>) {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Not authenticated." };

    // Server-side permission check: require explicit create permission on products
    try { requirePermission(session, 'products', 'c'); } catch (e: any) { return { success: false, message: 'Forbidden: insufficient permissions.' }; }

    if (!session.trainingProviderId) return { success: false, message: 'Forbidden: user has no training provider.' };

    const validatedFields = productSchema.safeParse(values)

    if (!validatedFields.success) {
      return { success: false, message: 'Invalid data provided. Please ensure you upload an image file.' }
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
    const session = await getSession();
    if (!session) return { success: false, message: "Not authenticated." };

    // Require update permission
    try { requirePermission(session, 'products', 'u'); } catch (e: any) { return { success: false, message: 'Forbidden: insufficient permissions.' }; }

    const validatedFields = productSchema.safeParse(values)

    if (!validatedFields.success) {
      return { success: false, message: 'Invalid data provided. Please ensure you upload an image file.' }
    }

    // Ensure product belongs to the same training provider
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Product not found.' };
    if (existing.trainingProviderId !== session.trainingProviderId) return { success: false, message: 'Forbidden: cannot modify product from another provider.' };

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

export async function deleteProduct(id: string) {
  try {
    const session = await getSession();
    if (!session) return { success: false, message: "Not authenticated." };

    // Require delete permission
    try { requirePermission(session, 'products', 'd'); } catch (e: any) { return { success: false, message: 'Forbidden: insufficient permissions.' }; }

    // Check if any courses are associated with this product
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { success: false, message: 'Product not found.' };
    if (existing.trainingProviderId !== session.trainingProviderId) return { success: false, message: 'Forbidden: cannot delete product from another provider.' };

    const associatedCourses = await prisma.course.count({
      where: { productId: id },
    });

    if (associatedCourses > 0) {
      return { success: false, message: 'Cannot delete product. It is currently associated with one or more courses.' };
    }

    await prisma.product.delete({
      where: { id },
    });

    revalidatePath('/admin/products');
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, message: 'Failed to delete product.' };
  }
}
