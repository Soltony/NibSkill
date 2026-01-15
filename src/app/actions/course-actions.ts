
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'
import { requirePermission } from '@/lib/authorization'

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  productId: z.string({ required_error: "Please select a product." }),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  isPaid: z.boolean().default(false),
  price: z.coerce.number().optional(),
  currency: z.enum(["USD", "ETB"]).optional(),
  hasCertificate: z.boolean().default(false),
  status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]).optional(),
  isPublic: z.boolean().default(true),
  districtIds: z.array(z.string()).optional(),
  branchIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
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
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'courses', 'c'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to create courses." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { districtIds, branchIds, departmentIds, ...courseData } = validatedFields.data;

        const product = await prisma.product.findUnique({
            where: { id: courseData.productId, trainingProviderId: session.trainingProviderId }
        });

        if (!product) {
            return { success: false, message: "Associated product not found." }
        }

        await prisma.course.create({
            data: {
                ...courseData,
                price: courseData.isPaid ? courseData.price : null,
                currency: courseData.isPaid ? courseData.currency : null,
                imageUrl: product.imageUrl,
                imageHint: product.imageHint,
                imageDescription: product.description, // Use product description as a fallback for image description
                status: 'PENDING',
                trainingProviderId: session.trainingProviderId,
                assignedDistricts: districtIds ? { connect: districtIds.map(id => ({ id })) } : undefined,
                assignedBranches: branchIds ? { connect: branchIds.map(id => ({ id })) } : undefined,
                assignedDepartments: departmentIds ? { connect: departmentIds.map(id => ({ id })) } : undefined,
                // Set primary scalar relations when a single group is selected for convenience
                departmentId: departmentIds && departmentIds.length > 0 ? departmentIds[0] : undefined,
                districtId: districtIds && districtIds.length > 0 ? districtIds[0] : undefined,
                branchId: branchIds && branchIds.length > 0 ? branchIds[0] : undefined,
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
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'courses', 'u'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to update courses." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        const existingCourse = await prisma.course.findUnique({ where: { id } });
        if (!existingCourse || existingCourse.trainingProviderId !== session.trainingProviderId) {
            return { success: false, message: "Course not found or you do not have permission to edit it." };
        }

        const product = await prisma.product.findUnique({
            where: { id: validatedFields.data.productId, trainingProviderId: session.trainingProviderId }
        });

        if (!product) {
            return { success: false, message: "Associated product not found." }
        }

        let newStatus = validatedFields.data.status;
        if (existingCourse.status === 'REJECTED') {
            newStatus = 'PENDING';
        }

        const { districtIds, branchIds, departmentIds, ...courseData } = validatedFields.data;

        await prisma.course.update({
            where: { id },
            data: {
                ...courseData,
                price: courseData.isPaid ? courseData.price : null,
                currency: courseData.isPaid ? courseData.currency : null,
                imageUrl: product.imageUrl,
                imageHint: product.imageHint,
                imageDescription: product.description,
                status: newStatus,
                rejectionReason: newStatus === 'PENDING' ? null : existingCourse.rejectionReason,
                assignedDistricts: { set: districtIds?.map(id => ({ id })) },
                assignedBranches: { set: branchIds?.map(id => ({ id })) },
                assignedDepartments: { set: departmentIds?.map(id => ({ id })) },
                // Keep primary scalar relations in sync: set to first selected id or clear when none selected
                departmentId: departmentIds && departmentIds.length > 0 ? departmentIds[0] : null,
                districtId: districtIds && districtIds.length > 0 ? districtIds[0] : null,
                branchId: branchIds && branchIds.length > 0 ? branchIds[0] : null,
            }
        });

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        revalidatePath(`/admin/courses/${id}`);
        revalidatePath(`/courses/${id}`);
        const message = newStatus === 'PENDING' ? 'Course resubmitted for approval.' : 'Course updated successfully.';
        return { success: true, message };
    } catch (error) {
        console.error("Error updating course:", error);
        return { success: false, message: "Failed to update course." }
    }
}

export async function deleteCourse(id: string) {
    try {
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'courses', 'd'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to delete courses." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const course = await prisma.course.findUnique({ where: { id } });
        if (!course || course.trainingProviderId !== session.trainingProviderId) {
             return { success: false, message: "Course not found or you do not have permission to delete it." };
        }

        // Must disconnect relations before deleting
        await prisma.course.update({
            where: { id },
            data: {
                assignedDistricts: { set: [] },
                assignedBranches: { set: [] },
                assignedDepartments: { set: [] },
            }
        });

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
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'approvals', 'u'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to publish courses." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };
        
        const course = await prisma.course.findUnique({ where: { id } });
        if (!course || course.trainingProviderId !== session.trainingProviderId) {
             return { success: false, message: "Course not found or you do not have permission to publish it." };
        }

        await prisma.course.update({
            where: { id },
            data: { status: 'PUBLISHED', rejectionReason: null }
        });

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        return { success: true, message: 'Course published successfully.' }
    } catch (error) {
        console.error("Error publishing course:", error);
        return { success: false, message: "Failed to publish course." }
    }
}


const rejectionSchema = z.object({
  reason: z.string().min(10, "A reason for rejection is required (min. 10 characters)."),
})

export async function rejectCourse(id: string, values: z.infer<typeof rejectionSchema>) {
    try {
        const session = await getSession();
        if (!session?.id) return { success: false, message: "Not authenticated." };
        try { requirePermission(session, 'approvals', 'u'); } catch (e: any) { return { success: false, message: "Unauthorized: You do not have permission to reject courses." }; }
        if (!session.trainingProviderId) return { success: false, message: "Forbidden: user has no training provider." };

        const validatedFields = rejectionSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const course = await prisma.course.findUnique({ where: { id } });
        if (!course || course.trainingProviderId !== session.trainingProviderId) {
             return { success: false, message: "Course not found or you do not have permission to reject it." };
        }

        await prisma.course.update({
            where: { id },
            data: { 
                status: 'REJECTED',
                rejectionReason: validatedFields.data.reason
            }
        });

        revalidatePath('/admin/courses/list');
        revalidatePath('/admin/courses/approvals');
        return { success: true, message: 'Course rejected.' }
    } catch (error) {
        console.error("Error rejecting course:", error);
        return { success: false, message: "Failed to reject course." }
    }
}
