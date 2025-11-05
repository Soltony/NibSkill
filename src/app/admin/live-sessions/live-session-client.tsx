
"use client"

import { useState } from "react"
import type { LiveSession, User, UserAttendedLiveSession, LiveSessionStatus } from "@prisma/client"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { deleteLiveSession, endLiveSession } from "@/app/actions/live-session-actions"

export { AddLiveSessionDialog } from "@/components/add-live-session-dialog"
export { EditLiveSessionDialog } from "@/components/edit-live-session-dialog"

type SessionWithAttendees = LiveSession & { attendedBy: (UserAttendedLiveSession & { user: User })[] };

export const ViewAttendeesDialog = ({ session }: { session: SessionWithAttendees }) => {

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto">
                    {session.attendedBy?.length || 0}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attendees for "{session.title}"</DialogTitle>
                </DialogHeader>
                <div className="py-4 max-h-96 overflow-y-auto">
                    {session.attendedBy.length > 0 ? (
                        <ul className="space-y-3">
                            {session.attendedBy.map(item => (
                                <li key={item.userId} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={item.user.avatarUrl ?? undefined} alt={item.user.name} />
                                        <AvatarFallback>{item.user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{item.user.name}</p>
                                        <p className="text-sm text-muted-foreground">{item.user.email}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted-foreground text-center">No one has marked attendance for this session yet.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function EndLiveSessionAction({ session }: { session: LiveSession }) {
    const [isEnding, setIsEnding] = useState(false);
    const { toast } = useToast();

    const handleEndSession = async () => {
        setIsEnding(true);
        const result = await endLiveSession(session.id);
        if (result.success) {
            toast({
                title: "Session Ended",
                description: `The session "${session.title}" has been marked as ended.`,
            });
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive"
            });
        }
        setIsEnding(false);
    };

    if (session.status !== 'LIVE') return null;

    return (
        <Button variant="destructive" size="sm" onClick={handleEndSession} disabled={isEnding}>
            {isEnding ? 'Ending...' : 'End Session'}
        </Button>
    )
}


export function DeleteLiveSessionAction({ session }: { session: LiveSession }) {
    const [sessionToDelete, setSessionToDelete] = useState<LiveSession | null>(null)
    const { toast } = useToast()

    const handleConfirmDelete = async () => {
        if (sessionToDelete) {
            const result = await deleteLiveSession(sessionToDelete.id);

            if (result.success) {
                 toast({
                    title: "Session Deleted",
                    description: `The session "${sessionToDelete.title}" has been deleted.`,
                })
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive"
                });
            }
            setSessionToDelete(null)
        }
    }
    return (
        <>
            <Button variant="destructive-outline" size="sm" onClick={() => setSessionToDelete(session)}>Delete</Button>
            <AlertDialog
                open={!!sessionToDelete}
                onOpenChange={(open) => !open && setSessionToDelete(null)}
            >
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the session{" "}
                    <span className="font-semibold">"{sessionToDelete?.title}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirmDelete}>
                    Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
