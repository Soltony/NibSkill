'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { roles } from '@/lib/data'
import { sendEmail, getLoginCredentialsEmailTemplate } from '@/lib/email'
import { randomBytes } from 'crypto'

const formSchema = z.object({
  name: z.string().min(2, "Provider name is required."),
  address: z.string().min(5, "Address is required."),
  accountNumber: z.string().min(5, "Account number is required."),
  adminFirstName: z.string().min(2, "Admin first name is required."),
  adminLastName: z.string().min(2, "Admin last name is required."),
  adminEmail: z.string().email("A valid email is required."),
  adminPhoneNumber: z.string().min(5, "A valid phone number is required."),
})

export async function addTrainingProvider(values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { name, address, accountNumber, adminFirstName, adminLastName, adminEmail, adminPhoneNumber } = validatedFields.data;

        const providerAdminRole = await prisma.role.findFirst({
            where: { name: 'Training Provider' }
        });
        if (!providerAdminRole) {
            throw new Error("Training Provider role not found.");
        }
        
        const adminPassword = randomBytes(4).toString('hex'); // 8 chars
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
                        avatarUrl: `https://picsum.photos/seed/${adminEmail}/100/100`,
                        roles: {
                            create: {
                                roleId: providerAdminRole.id
                            }
                        }
                    }
                },
                roles: {
                    create: [
                        { name: 'Admin', permissions: defaultAdminRolePermissions || {} },
                        { name: 'Staff', permissions: defaultStaffRolePermissions || {} },
                    ]
                }
            },
            include: {
                users: true
            }
        });

        const newAdmin = newProvider.users[0];
        if (newAdmin?.email) {
            const loginUrl = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/login` : 'http://localhost:9002/login';
            const emailHtml = getLoginCredentialsEmailTemplate(adminPhoneNumber, adminPassword, loginUrl);
            await sendEmail({
                to: newAdmin.email,
                subject: 'Your NIB Training Platform Admin Credentials',
                html: emailHtml
            });
        }


        revalidatePath('/super-admin/providers');
        revalidatePath('/super-admin/dashboard');
        return { success: true, message: 'Training provider registered successfully.' }
    } catch (error: any) {
        console.error("Error registering training provider:", error);
        if (error.code === 'P2002') {
            const target = error.meta?.target as string[];
            if (target.includes('name') || target.includes('accountNumber')) {
                 return { success: false, message: "A provider with this name or account number already exists." }
            }
            return { success: false, message: "A user with this email or phone number might already exist in a conflicting context." };
        }
        return { success: false, message: "Failed to register training provider." }
    }
}

const updateProviderSchema = z.object({
  providerId: z.string(),
  name: z.string().min(2, "Provider name is required."),
  address: z.string().min(5, "Address is required."),
  accountNumber: z.string().min(5, "Account number is required."),
  adminId: z.string(),
  adminName: z.string().min(2, "Admin name is required."),
  adminEmail: z.string().email("A valid email is required."),
  adminPhoneNumber: z.string().min(5, "A valid phone number is required."),
  adminPassword: z.string().min(6, "Password must be at least 6 characters.").optional().or(z.literal('')),
})

export async function updateTrainingProvider(values: z.infer<typeof updateProviderSchema>) {
    try {
        const validatedFields = updateProviderSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." };
        }

        const { providerId, name, address, accountNumber, adminId, adminName, adminEmail, adminPhoneNumber, adminPassword } = validatedFields.data;

        await prisma.$transaction(async (tx) => {
            await tx.trainingProvider.update({
                where: { id: providerId },
                data: { name, address, accountNumber }
            });
            
            let userUpdateData: any = { 
                name: adminName,
                email: adminEmail,
                phoneNumber: adminPhoneNumber
            };
            
            if (adminPassword) {
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                userUpdateData.password = hashedPassword;
            }

            await tx.user.update({
                where: { id: adminId },
                data: userUpdateData
            });
        });

        revalidatePath('/super-admin/providers');
        return { success: true, message: "Provider updated successfully." };
    } catch (error: any) {
        console.error("Error updating provider:", error);
         if (error.code === 'P2002') {
            const target = error.meta?.target as string[];
            if (target.includes('name') || target.includes('accountNumber')) {
                return { success: false, message: "A provider with this name or account number already exists." }
            }
            if (target.includes('email') || target.includes('phoneNumber')) {
                return { success: false, message: "An admin with this email or phone number already exists." }
            }
        }
        return { success: false, message: "Failed to update provider." };
    }
}


export async function toggleProviderStatus(providerId: string, isActive: boolean) {
    try {
        await prisma.trainingProvider.update({
            where: { id: providerId },
            data: { isActive: isActive }
        });
        revalidatePath('/super-admin/providers');
        return { success: true, message: `Provider status has been updated to ${isActive ? "Active" : "Inactive"}.` };
    } catch (error: any) {
        console.error("Error updating provider status:", error);
        return { success: false, message: "Failed to update provider status." };
    }
}

export async function deleteTrainingProvider(providerId: string) {
    try {
        await prisma.trainingProvider.delete({
            where: { id: providerId }
        });
        revalidatePath('/super-admin/providers');
        return { success: true, message: 'Provider deleted successfully.' };
    } catch (error: any) {
        console.error("Error deleting provider:", error);
        return { success: false, message: 'Failed to delete provider.' };
    }
}
