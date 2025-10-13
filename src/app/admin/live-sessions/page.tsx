
"use client"

import { useState, useEffect } from "react"
import { liveSessions as initialLiveSessions, users, type LiveSession, type User } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { AddLiveSessionDialog } from "@/components/add-live-session-dialog"
import { EditLiveSessionDialog } from "@/components/edit-live-session-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const SESSIONS_STORAGE_KEY = "skillup-live-sessions"

const ViewAttendeesDialog = ({ session }: { session: LiveSession }) => {
    const attendees = users.filter(u => session.attendees?.includes(u.id));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" className="p-0 h-auto">
                    {session.attendees?.length || 0}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Attendees for "{session.title}"</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    {attendees.length > 0 ? (
                        <ul className="space-y-3">
                            {attendees.map(user => (
                                <li key={user.id} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
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

export default function LiveSessionManagementPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([])
  const [sessionToDelete, setSessionToDelete] = useState<LiveSession | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY)
    const allSessions = storedSessions ? JSON.parse(storedSessions).map((s: LiveSession) => ({...s, dateTime: new Date(s.dateTime)})) : initialLiveSessions;
    setSessions(allSessions)
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
    }
  }, [sessions, isLoaded])

  const handleSessionAdded = (newSession: LiveSession) => {
    setSessions((prev) => [newSession, ...prev].sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()))
  }

  const handleSessionUpdated = (updatedSession: LiveSession) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    )
  }

  const handleConfirmDelete = () => {
    if (sessionToDelete) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionToDelete.id))
      toast({
        title: "Session Deleted",
        description: `The session "${sessionToDelete.title}" has been deleted.`,
      })
      setSessionToDelete(null)
    }
  }

  const getStatus = (dateTime: Date): { text: "Upcoming" | "Past" | "Live", variant: "default" | "secondary" | "destructive" | "outline" } => {
    const now = new Date();
    const sessionTime = new Date(dateTime);
    const endTime = new Date(sessionTime.getTime() + 60 * 60 * 1000); // Assuming 1-hour duration
    
    if (now < sessionTime) return { text: "Upcoming", variant: "secondary" };
    if (now > endTime) return { text: "Past", variant: "outline" };
    return { text: "Live", variant: "destructive" };
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Live Sessions</h1>
          <p className="text-muted-foreground">
            Create, manage, and review all live training sessions.
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Live Sessions</CardTitle>
              <CardDescription>
                A list of all upcoming and past live sessions.
              </CardDescription>
            </div>
            <AddLiveSessionDialog onSessionAdded={handleSessionAdded} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Title</TableHead>
                  <TableHead>Speaker</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attendees</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="font-medium">{session.title}</TableCell>
                    <TableCell>{session.speaker}</TableCell>
                    <TableCell>{new Date(session.dateTime).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={getStatus(session.dateTime).variant}>
                        {getStatus(session.dateTime).text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                        <ViewAttendeesDialog session={session} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditLiveSessionDialog
                          session={session}
                          onSessionUpdated={handleSessionUpdated}
                        />
                         <Button variant="destructive-outline" size="sm" onClick={() => setSessionToDelete(session)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {sessions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No live sessions have been created yet.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>

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

    