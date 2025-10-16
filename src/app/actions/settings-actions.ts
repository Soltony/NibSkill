

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { FieldType } from '@prisma/client'

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

const registerUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string({ required_error: "A role is required." }),
})

export async function registerUser(values: z.infer<typeof registerUserSchema>) {
    try {
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
                avatarUrl: `https://picsum.photos/seed/user${Date.now()}/100/100`,
            }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'User registered successfully.' };

    } catch (error) {
        console.error("Error registering user:", error);
        return { success: false, message: 'Failed to register user. Email might already be in use.' };
    }
}

const permissionSchema = z.object({
  c: z.boolean(),
  r: z.boolean(),
  u: z.boolean(),
  d: z.boolean(),
});

const addRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  permissions: z.object({
    courses: permissionSchema,
    users: permissionSchema,
    analytics: permissionSchema,
    products: permissionSchema,
    quizzes: permissionSchema,
    staff: permissionSchema,
    liveSessions: permissionSchema,
  })
})

export async function addRole(values: z.infer<typeof addRoleSchema>) {
    try {
        const validatedFields = addRoleSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: 'Invalid data provided.' };
        }
        
        await prisma.role.create({
            data: {
                name: validatedFields.data.name,
                permissions: validatedFields.data.permissions,
            }
        });

        revalidatePath('/admin/settings');
        return { success: true, message: 'Role created successfully.' };

    } catch (error) {
        console.error("Error creating role:", error);
        return { success: false, message: 'Failed to create role.' };
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

const registrationFieldsSchema = z.object({
    fields: z.array(z.object({
        id: z.string(),
        label: z.string(),
        type: z.nativeEnum(FieldType),
        options: z.array(z.string()).optional().nullable(),
        enabled: z.boolean(),
        required: z.boolean(),
        isLoginIdentifier: z.boolean(),
    }))
})

export async function updateRegistrationFields(values: z.infer<typeof registrationFieldsSchema>) {
    try {
        const validatedFields = registrationFieldsSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        await prisma.$transaction(async (tx) => {
            // Ensure only one field is the login identifier
            const loginIdentifierCount = values.fields.filter(f => f.isLoginIdentifier).length;
            if (loginIdentifierCount !== 1) {
                throw new Error("Exactly one field must be selected as the login identifier.");
            }

            // Update all fields
            for (const field of validatedFields.data.fields) {
                await tx.registrationField.update({
                    where: { id: field.id },
                    data: {
                        label: field.label,
                        type: field.type,
                        options: field.options,
                        enabled: field.enabled,
                        required: field.required,
                        isLoginIdentifier: field.isLoginIdentifier
                    }
                });
            }
        });
        
        revalidatePath('/admin/settings');
        return { success: true, message: 'Registration form settings have been updated.' };

    } catch (error: any) {
        console.error("Error updating registration fields:", error);
        return { success: false, message: error.message || 'Failed to update settings.' };
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
                required: false
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


export async function getLoginIdentifier() {
    const loginField = await prisma.registrationField.findFirst({
        where: { isLoginIdentifier: true },
        select: { id: true, label: true }
    });
    
    // Fallback to email if nothing is configured
    if (!loginField) {
        return { id: 'email', label: 'Email' };
    }

    return loginField;
}

    