
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  organization: z.string().min(2, "Organization is required"),
  body: z.string().min(10, "Body text is required"),
  signatoryName: z.string().min(3, "Signatory name is required"),
  signatoryTitle: z.string().min(3, "Signatory title is required"),
  signatureUrl: z.string().nullable(),
  stampUrl: z.string().nullable(),
})

export async function updateCertificateTemplate(values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        await prisma.certificateTemplate.update({
            where: { id: "singleton" },
            data: validatedFields.data,
        });

        revalidatePath('/admin/certificate');
        return { success: true, message: 'Certificate template updated successfully.' }
    } catch (error) {
        console.error("Error updating certificate template:", error);
        return { success: false, message: "Failed to update template." }
    }
}
