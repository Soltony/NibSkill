
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { roles } from '@/lib/data'

const formSchema = z.object({
  name: z.string().min(2, "Provider name is required."),
  address: z.string().min(5, "Address is required."),
  accountNumber: z.string().min(5, "Account number is required."),
  adminFirstName: z.string().min(2, "Admin first name is required."),
  adminLastName: z.string().min(2, "Admin last name is required."),
  adminEmail: z.string().email("A valid email is required."),
  adminPassword: z.string().min(6, "Password must be at least 6 characters."),
  adminPhoneNumber: z.string().min(5, "A valid phone number is required."),
})

export async function addTrainingProvider(values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { name, address, accountNumber, adminFirstName, adminLastName, adminEmail, adminPassword, adminPhoneNumber } = validatedFields.data;

        const existingUser = await prisma.user.findFirst({
            where: { 
                OR: [
                    { email: adminEmail },
                    { phoneNumber: adminPhoneNumber }
                ]
             }
        });
        if (existingUser) {
            return { success: false, message: "A user with this email or phone number already exists." };
        }

        const providerAdminRole = await prisma.role.findFirst({
            where: { name: 'Training Provider' }
        });
        if (!providerAdminRole) {
            throw new Error("Training Provider role not found.");
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        const defaultAdminRolePermissions = roles.find(r => r.name === 'Admin')?.permissions;
        const defaultStaffRolePermissions = roles.find(r => r.name === 'Staff')?.permissions;

        const newProvider = await prisma.trainingProvider.create({
            data: {
                name,
                address,
                accountNumber,
                users: {
                    create: {
                        name: `${adminFirstName} ${adminLastName}`,
                        email: adminEmail,
                        password: hashedPassword,
                        phoneNumber: adminPhoneNumber,
                        roleId: providerAdminRole.id,
                        avatarUrl: `https://picsum.photos/seed/${adminEmail}/100/100`,
                    }
                },
                roles: {
                    create: [
                        { name: 'Admin', permissions: defaultAdminRolePermissions || {} },
                        { name: 'Staff', permissions: defaultStaffRolePermissions || {} },
                    ]
                }
            }
        });

        revalidatePath('/super-admin');
        return { success: true, message: 'Training provider registered successfully.' }
    } catch (error: any) {
        console.error("Error registering training provider:", error);
        if (error.code === 'P2002') {
            return { success: false, message: "A provider with this name or account number already exists." }
        }
        return { success: false, message: "Failed to register training provider." }
    }
}

const updateProviderSchema = z.object({
  name: z.string().min(2, "Provider name is required."),
  address: z.string().min(5, "Address is required."),
  accountNumber: z.string().min(5, "Account number is required."),
})

export async function updateTrainingProvider(id: string, values: z.infer<typeof updateProviderSchema>) {
    try {
        const validatedFields = updateProviderSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." };
        }

        await prisma.trainingProvider.update({
            where: { id },
            data: validatedFields.data
        });

        revalidatePath('/super-admin');
        return { success: true, message: "Provider updated successfully." };
    } catch (error: any) {
        console.error("Error updating provider:", error);
         if (error.code === 'P2002') {
            return { success: false, message: "A provider with this name or account number already exists." }
        }
        return { success: false, message: "Failed to update provider." };
    }
}

