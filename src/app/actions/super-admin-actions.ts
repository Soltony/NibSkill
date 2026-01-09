

'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import bcrypt from 'bcryptjs'
import { roles } from '@/lib/data'
import { sendEmail, getLoginCredentialsEmailTemplate } from '@/lib/email'
import { generateSecurePassword } from '@/lib/crypto'
import { validatePasswordBasic, isBreachedPassword, recordPasswordHistory } from '@/lib/password';
import { getSession } from '@/lib/auth'

const phoneValidation = z.string().min(1, "Phone number is required.")
    .refine(val => (val.startsWith('09') && val.length === 10 && /^\d+$/.test(val)) || (val.startsWith('251') && val.length === 12 && /^\d+$/.test(val)), {
        message: "Phone number must be 10 digits starting with 09, or 12 digits starting with 251."
    });

const formSchema = z.object({
  name: z.string().min(2, "Provider name is required."),
  address: z.string().min(5, "Address is required."),
  accountNumber: z.string().min(5, "Account number is required."),
  adminFirstName: z.string().min(2, "Admin first name is required."),
  adminLastName: z.string().min(2, "Admin last name is required."),
  adminEmail: z.string().email("A valid email is required."),
  adminPhoneNumber: phoneValidation,
})

export async function addTrainingProvider(values: z.infer<typeof formSchema>) {
    try {
        const session = await getSession();
        if (!session || session.role.name !== 'Super Admin') {
            return { success: false, message: "Unauthorized: You do not have permission to perform this action." };
        }

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { name, address, accountNumber, adminFirstName, adminLastName, adminEmail, adminPhoneNumber } = validatedFields.data;
        
        const generatedPassword = generateSecurePassword();

        const providerAdminRole = await prisma.role.findFirst({
            where: { name: 'Training Provider' }
        });
        if (!providerAdminRole) {
            throw new Error("Training Provider role not found.");
        }

        const hashedPassword = await bcrypt.hash(generatedPassword, 10);
        
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
                        passwordChangeRequired: true,
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
                users: true // Include the created user to get their email
            }
        });
        
        const newAdmin = newProvider.users[0];

        await prisma.user.update({
            where: { id: newAdmin.id },
            data: {
                trainingProvider: {
                    connect: {
                        id: newProvider.id,
                    },
                },
            },
        });

        if (newAdmin && newAdmin.email) {
            const loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login/admin` : 'http://localhost:3000/login/admin';
            await sendEmail({
                to: newAdmin.email,
                subject: "Your NIB Training Admin Account Credentials",
                html: getLoginCredentialsEmailTemplate(newAdmin.phoneNumber || newAdmin.email, generatedPassword, loginUrl),
            });
        }

        // record initial password history for the created admin
        try { await recordPasswordHistory(newAdmin.id, hashedPassword); } catch (e) { }


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
            // Fallback for other unique constraint issues, though less likely now
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
  adminPhoneNumber: phoneValidation,
    adminPassword: z.string().min(8, "Password must be at least 8 characters long.").optional().or(z.literal('')),
})

export async function updateTrainingProvider(values: z.infer<typeof updateProviderSchema>) {
    try {
        const session = await getSession();
        if (!session || session.role.name !== 'Super Admin') {
            return { success: false, message: "Unauthorized: You do not have permission to perform this action." };
        }

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
                const { ok, errors } = validatePasswordBasic(adminPassword);
                if (!ok) throw new Error(`Invalid admin password: ${errors.join('; ')}`);
                const breached = await isBreachedPassword(adminPassword);
                if (breached) throw new Error('Admin password appears in known breaches.');
                const hashedPassword = await bcrypt.hash(adminPassword, 10);
                userUpdateData.password = hashedPassword;
                userUpdateData.passwordChangeRequired = true;
                await recordPasswordHistory(adminId, hashedPassword);
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
        const session = await getSession();
        if (!session || session.role.name !== 'Super Admin') {
            return { success: false, message: "Unauthorized: You do not have permission to perform this action." };
        }

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
        const session = await getSession();
        if (!session || session.role.name !== 'Super Admin') {
            return { success: false, message: "Unauthorized: You do not have permission to perform this action." };
        }
        
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
