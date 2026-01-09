
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'
import { getSession } from '@/lib/auth'

const imageValidation = z.string().refine(
  (val) => val.startsWith('data:image/'), 
  "Must be a valid image data URL."
).nullable();

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  organization: z.string().min(2, "Organization is required"),
  body: z.string().min(10, "Body text is required"),
  logoUrl: imageValidation,
  signatoryName: z.string().min(3, "Signatory name is required"),
  signatoryTitle: z.string().min(3, "Signatory title is required"),
  signatureUrl: imageValidation,
  stampUrl: imageValidation,
  primaryColor: z.string().optional(),
  borderStyle: z.string().optional(),
  templateStyle: z.string().optional(),
})

export async function updateCertificateTemplate(values: z.infer<typeof formSchema>) {
    try {
        const session = await getSession();
        if (!session || !session.trainingProviderId) {
            return { success: false, message: "Unauthorized operation." };
        }

        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided. Please ensure all uploaded files are images." }
        }

        await prisma.certificateTemplate.upsert({
            where: { trainingProviderId: session.trainingProviderId },
            update: validatedFields.data,
            create: {
                ...validatedFields.data,
                trainingProviderId: session.trainingProviderId,
            }
        });

        revalidatePath('/admin/certificate');
        revalidatePath('/courses', 'layout');
        revalidatePath('/learning-paths', 'layout');
        return { success: true, message: 'Certificate template updated successfully.' }
    } catch (error) {
        console.error("Error updating certificate template:", error);
        return { success: false, message: "Failed to update template." }
    }
}
