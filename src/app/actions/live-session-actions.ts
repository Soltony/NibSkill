
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import prisma from '@/lib/db'

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  speaker: z.string().min(3, "Speaker is required"),
  description: z.string().min(10, "Description is required"),
  keyTakeaways: z.string().min(10, "Key takeaways are required"),
  dateTime: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid date" }),
  platform: z.enum(["Zoom", "Google_Meet"]),
  joinUrl: z.string().url("Must be a valid URL"),
  recordingUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  isRestricted: z.boolean().default(false),
  allowedUserIds: z.array(z.string()).optional(),
})

export async function addLiveSession(values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }
        
        const { isRestricted, allowedUserIds, ...sessionData } = validatedFields.data;

        await prisma.liveSession.create({
            data: {
                ...sessionData,
                dateTime: new Date(sessionData.dateTime),
                isRestricted,
                allowedAttendees: isRestricted && allowedUserIds ? {
                    create: allowedUserIds.map(userId => ({
                        user: { connect: { id: userId } }
                    }))
                } : undefined,
            }
        });

        revalidatePath('/admin/live-sessions');
        return { success: true, message: 'Live Session added successfully.' }
    } catch (error) {
        console.error("Error adding live session:", error);
        return { success: false, message: "Failed to add live session." }
    }
}

export async function updateLiveSession(id: string, values: z.infer<typeof formSchema>) {
    try {
        const validatedFields = formSchema.safeParse(values);
        if (!validatedFields.success) {
            return { success: false, message: "Invalid data provided." }
        }

        const { isRestricted, allowedUserIds, ...sessionData } = validatedFields.data;

        await prisma.liveSession.update({
            where: { id },
            data: {
                ...sessionData,
                dateTime: new Date(sessionData.dateTime),
                isRestricted,
                allowedAttendees: {
                    deleteMany: {},
                    create: isRestricted && allowedUserIds ? allowedUserIds.map(userId => ({
                        user: { connect: { id: userId } }
                    })) : undefined,
                }
            }
        });

        revalidatePath('/admin/live-sessions');
        revalidatePath('/live-sessions');
        return { success: true, message: 'Live Session updated successfully.' }
    } catch (error) {
        console.error("Error updating live session:", error);
        return { success: false, message: "Failed to update live session." }
    }
}


export async function deleteLiveSession(id: string) {
    try {
        await prisma.liveSession.delete({
            where: { id }
        });

        revalidatePath('/admin/live-sessions');
        revalidatePath('/live-sessions');
        return { success: true, message: 'Live Session deleted successfully.' }
    } catch (error) {
        console.error("Error deleting live session:", error);
        return { success: false, message: "Failed to delete live session." }
    }
}

export async function markAttendance(sessionId: string, userId: string) {
    try {
        const existing = await prisma.userAttendedLiveSession.findUnique({
            where: {
                userId_sessionId: { userId, sessionId }
            }
        });

        if (existing) {
            return { success: false, message: 'Attendance already marked.' };
        }

        await prisma.userAttendedLiveSession.create({
            data: {
                userId,
                sessionId,
            }
        });

        revalidatePath('/live-sessions');
        return { success: true, message: 'Attendance marked successfully.' };

    } catch (error) {
        console.error("Error marking attendance:", error);
        return { success: false, message: "Failed to mark attendance." }
    }
}
