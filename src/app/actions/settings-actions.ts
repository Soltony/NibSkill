

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { FieldType } from '@prisma/client'
import { getSession } from '@/lib/auth'

const updateUserRoleSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
})

export async function updateUserRole(values: z.infer<typeof updateUserRoleSchema>) {
    try {
        const validatedFields = updateUserRoleSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }
        await prisma.user.update({
            where: { id: validatedFields.data.userId },
            data: { roleId: validatedFields.data.roleId }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'User role updated.' };
    } catch (error) {
        console.error("Error updating user role:", error);
        return { success: false, message: 'Failed to update user role.' };
    }
}

const updateUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  roleId: z.string({ required_error: "A role is required." }),
  phoneNumber: z.string().optional(),
})

export async function updateUser(userId: string, values: z.infer<typeof updateUserSchema>) {
    try {
        const validatedFields = updateUserSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }
        await prisma.user.update({
            where: { id: userId },
            data: validatedFields.data
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'User updated successfully.' };
    } catch (error) {
        console.error("Error updating user:", error);
         if ((error as any).code === 'P2002') {
             if ((error as any).meta?.target.includes('email')) {
                return { success: false, message: 'Failed to update user. Email might already be in use.' };
             }
             if ((error as any).meta?.target.includes('phoneNumber')) {
                 return { success: false, message: 'Failed to update user. Phone number might already be in use.' };
             }
        }
        return { success: false, message: 'Failed to update user.' };
    }
}


const registerUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string({ required_error: "A role is required." }),
  phoneNumber: z.string().optional(),
})

export async function registerUser(values: z.infer<typeof registerUserSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized operation." };
        }

        const validatedFields = registerUserSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }

        const hashedPassword = await bcrypt.hash(validatedFields.data.password, 10);
        
        await prisma.user.create({
            data: {
                name: validatedFields.data.name,
                email: validatedFields.data.email,
                password: hashedPassword,
                roleId: validatedFields.data.roleId,
                phoneNumber: validatedFields.data.phoneNumber,
                avatarUrl: `https://picsum.photos/seed/user${Date.now()}/100/100`,
                trainingProviderId: session.trainingProviderId,
            }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'User registered successfully.' };

    } catch (error) {
        console.error("Error registering user:", error);
        if ((error as any).code === 'P2002') {
             if ((error as any).meta?.target.includes('email')) {
                return { success: false, message: 'Failed to register user. Email might already be in use.' };
             }
             if ((error as any).meta?.target.includes('phoneNumber')) {
                 return { success: false, message: 'Failed to register user. Phone number might already be in use.' };
             }
        }
        return { success: false, message: 'Failed to register user.' };
    }
}

const permissionSchema = z.object({
  c: z.boolean(),
  r: z.boolean(),
  u: z.boolean(),
  d: z.boolean(),
});

const roleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  permissions: z.object({
    dashboard: permissionSchema,
    products: permissionSchema,
    courses: permissionSchema,
    approvals: permissionSchema,
    learningPaths: permissionSchema,
    quizzes: permissionSchema,
    grading: permissionSchema,
    liveSessions: permissionSchema,
    reports: permissionSchema,
    certificate: permissionSchema,
    settings: permissionSchema,
  })
})

export async function addRole(values: z.infer<typeof roleSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized" };
        }

        const validatedFields = roleSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }
        
        await prisma.role.create({
            data: {
                name: validatedFields.data.name,
                permissions: validatedFields.data.permissions as any,
                trainingProviderId: session.trainingProviderId,
            }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'Role created successfully.' };

    } catch (error) {
        console.error("Error creating role:", error);
        if ((error as any).code === 'P2002') {
            return { success: false, message: 'A role with this name already exists for your organization.' };
        }
        return { success: false, message: 'Failed to create role.' };
    }
}

export async function updateRole(id: string, values: z.infer<typeof roleSchema>) {
    try {
        const validatedFields = roleSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }
        
        await prisma.role.update({
            where: { id },
            data: {
                name: validatedFields.data.name,
                permissions: validatedFields.data.permissions as any,
            }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'Role updated successfully.' };

    } catch (error) {
        console.error("Error updating role:", error);
        return { success: false, message: 'Failed to update role.' };
    }
}


export async function deleteRole(roleId: string) {
    try {
        await prisma.role.delete({ where: { id: roleId }});
        revalidatePath('/admin/settings');
        return { success: true, message: 'Role deleted successfully.' };
    } catch (error) {
        console.error("Error deleting role:", error);
        if ((error as any).code === 'P2003') {
            return { success: false, message: 'Cannot delete role as it is still assigned to users.' };
        }
        return { success: false, message: 'Failed to delete role.' };
    }
}

export async function deleteUser(userId: string) {
    try {
        await prisma.user.delete({ where: { id: userId }});
        revalidatePath('/admin/settings');
        return { success: true, message: 'User deleted successfully.' };
    } catch (error) {
        console.error("Error deleting user:", error);
        return { success: false, message: 'Failed to delete user.' };
    }
}

const registrationFieldsSchema = z.object({
    fields: z.array(z.object({
        id: z.string(),
        label: z.string(),
        enabled: z.boolean(),
        required: z.boolean(),
    }))
})

export async function updateRegistrationFields(values: z.infer<typeof registrationFieldsSchema>) {
    try {
        const validatedFields = registrationFieldsSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        await prisma.$transaction(
            validatedFields.data.fields.map(field => 
                prisma.registrationField.update({
                    where: { id: field.id },
                    data: {
                        enabled: field.enabled,
                        required: field.required
                    }
                })
            )
        )
        
        revalidatePath('/admin/settings');
        return { success: true, message: 'Registration form settings have been updated.' };

    } catch (error) {
        console.error("Error updating registration fields:", error);
        return { success: false, message: 'Failed to update settings.' };
    }
}

const addFieldSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters."),
  id: z.string().min(2, "ID must be at least 2 characters.").regex(/^[a-zA-Z0-9_]+$/, "ID can only contain letters, numbers, and underscores."),
  type: z.nativeEnum(FieldType),
  options: z.string().optional(),
})

export async function addRegistrationField(values: z.infer<typeof addFieldSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized" };
        }

        const validatedFields = addFieldSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        await prisma.registrationField.create({
            data: {
                id: validatedFields.data.id,
                label: validatedFields.data.label,
                type: validatedFields.data.type,
                options: validatedFields.data.options?.split(',').map(o => o.trim()).filter(o => o),
                enabled: false,
                required: false,
                trainingProviderId: session.trainingProviderId,
            }
        });
        
        revalidatePath('/admin/settings');
        return { success: true, message: 'Field added successfully.' };

    } catch (error) {
        console.error("Error adding registration field:", error);
        if ((error as any).code === 'P2002') {
             return { success: false, message: 'Failed to add field. The ID might already exist.' };
        }
        return { success: false, message: 'Failed to add field.' };
    }
}

export async function deleteRegistrationField(id: string) {
    try {
        await prisma.registrationField.delete({ where: { id }});
        revalidatePath('/admin/settings');
        return { success: true, message: 'Field deleted successfully.' };
    } catch (error) {
        console.error("Error deleting registration field:", error);
        return { success: false, message: 'Failed to delete field.' };
    }
}
