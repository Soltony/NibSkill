
'use server'

import prisma from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function markNotificationsAsRead(notificationIds: string[]) {
    try {
        await prisma.notification.updateMany({
            where: {
                id: {
                    in: notificationIds,
                },
                isRead: false
            },
            data: {
                isRead: true,
            },
        });
        revalidatePath('/layout'); // Revalidate layout to update unread count
        return { success: true };
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        return { success: false, message: 'Failed to update notifications.' };
    }
}
