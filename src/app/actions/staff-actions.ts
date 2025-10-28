
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

// District Actions
const districtSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
})

export async function addDistrict(values: z.infer<typeof districtSchema>) {
  try {
    const session = await getSession();
    if (!session || !session.trainingProviderId) {
        return { success: false, message: "Unauthorized" };
    }
    const validatedFields = districtSchema.safeParse(values)
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided." }
    }

    await prisma.district.create({
      data: { 
        name: validatedFields.data.name,
        trainingProviderId: session.trainingProviderId,
      },
    })

    revalidatePath('/admin/staff')
    return { success: true, message: 'District added successfully.' }
  } catch (error) {
    console.error("Error adding district:", error);
    return { success: false, message: 'Failed to add district.' }
  }
}

export async function updateDistrict(id: string, values: z.infer<typeof districtSchema>) {
  try {
    const validatedFields = districtSchema.safeParse(values)
    if (!validatedFields.success) {
      return { success: false, message: "Invalid data provided." }
    }

    await prisma.district.update({
      where: { id },
      data: { name: validatedFields.data.name },
    })

    revalidatePath('/admin/staff')
    return { success: true, message: 'District updated successfully.' }
  } catch (error) {
    console.error("Error updating district:", error);
    return { success: false, message: 'Failed to update district.' }
  }
}

export async function deleteDistrict(id: string) {
  try {
    await prisma.district.delete({ where: { id } })
    revalidatePath('/admin/staff')
    return { success: true, message: 'District deleted successfully.' }
  } catch (error) {
    console.error("Error deleting district:", error);
    return { success: false, message: 'Failed to delete district.' }
  }
}

// Branch Actions
const branchSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  districtId: z.string({ required_error: "Please select a district." }),
})

export async function addBranch(values: z.infer<typeof branchSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized" };
        }
        const validatedFields = branchSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data." };
        }
        await prisma.branch.create({
            data: {
              ...validatedFields.data,
              trainingProviderId: session.trainingProviderId,
            },
        });
        revalidatePath('/admin/staff');
        return { success: true, message: 'Branch added.' };
    } catch (error) {
        return { success: false, message: 'Failed to add branch.' };
    }
}

export async function updateBranch(id: string, values: z.infer<typeof branchSchema>) {
    try {
        const validatedFields = branchSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data." };
        }
        await prisma.branch.update({
            where: { id },
            data: validatedFields.data,
        });
        revalidatePath('/admin/staff');
        return { success: true, message: 'Branch updated.' };
    } catch (error) {
        return { success: false, message: 'Failed to update branch.' };
    }
}

export async function deleteBranch(id: string) {
    try {
        await prisma.branch.delete({ where: { id } });
        revalidatePath('/admin/staff');
        return { success: true, message: 'Branch deleted.' };
    } catch (error) {
        return { success: false, message: 'Failed to delete branch.' };
    }
}


// Department Actions
const departmentSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
})

export async function addDepartment(values: z.infer<typeof departmentSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized" };
        }
        const validatedFields = departmentSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data." };
        }
        await prisma.department.create({
            data: {
              name: validatedFields.data.name,
              trainingProviderId: session.trainingProviderId,
            },
        });
        revalidatePath('/admin/staff');
        return { success: true, message: 'Department added.' };
    } catch (error) {
        return { success: false, message: 'Failed to add department.' };
    }
}

export async function updateDepartment(id: string, values: z.infer<typeof departmentSchema>) {
    try {
        const validatedFields = departmentSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data." };
        }
        await prisma.department.update({
            where: { id },
            data: validatedFields.data,
        });
        revalidatePath('/admin/staff');
        return { success: true, message: 'Department updated.' };
    } catch (error) {
        return { success: false, message: 'Failed to update department.' };
    }
}

export async function deleteDepartment(id: string) {
    try {
        await prisma.department.delete({ where: { id } });
        revalidatePath('/admin/staff');
        return { success: true, message: 'Department deleted.' };
    } catch (error) {
        return { success: false, message: 'Failed to delete department.' };
    }
}
