
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'

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

        await prisma.trainingProvider.create({
            data: validatedFields.data
        });

        revalidatePath('/super-admin');
        return { success: true, message: 'Training provider registered successfully.' }
    } catch (error: any) {
        console.error("Error registering training provider:", error);
        if (error.code === 'P2002') {
            return { success: false, message: "A provider with this name, email, or account number already exists." }
        }
        return { success: false, message: "Failed to register training provider." }
    }
}
