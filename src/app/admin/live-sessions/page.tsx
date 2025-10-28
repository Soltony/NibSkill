

import prisma from "@/lib/db"
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
import { Badge } from "@/components/ui/badge"
import { AddLiveSessionDialog, EditLiveSessionDialog, ViewAttendeesDialog, DeleteLiveSessionAction } from "./live-session-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"

async function getData(trainingProviderId: string) {
  const sessions = await prisma.liveSession.findMany({
    where: { trainingProviderId },
    orderBy: {
      dateTime: 'desc'
    },
    include: {
      attendedBy: {
        include: {
          user: true
        }
      },
      allowedAttendees: {
        include: {
            user: true
        }
      }
    }
  });

  const users = await prisma.user.findMany({ 
    where: { 
      trainingProviderId,
      role: { name: 'Staff' } 
    } 
  });

  return { sessions, users };
}

export default async function LiveSessionManagementPage() {
  const sessionData = await getSession();
  if (!sessionData || !sessionData.trainingProviderId) {
    notFound();
  }

  const { sessions, users } = await getData(sessionData.trainingProviderId);

  const getStatus = (dateTime: Date): { text: "Upcoming" | "Past" | "Live", variant: "default" | "secondary" | "destructive" | "outline" } => {
    const now = new Date();
    const sessionTime = new Date(dateTime);
    const endTime = new Date(sessionTime.getTime() + 60 * 60 * 1000); // Assuming 1-hour duration
    
    if (now < sessionTime) return { text: "Upcoming", variant: "secondary" };
    if (now > endTime) return { text: "Past", variant: "outline" };
    return { text: "Live", variant: "destructive" };
  }

  return (
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
          <AddLiveSessionDialog users={users}/>
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
                <TableHead>Access</TableHead>
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
                   <TableCell>
                    {session.isRestricted ? (
                        <Badge variant="destructive">Restricted</Badge>
                    ) : (
                        <Badge variant="secondary">Open to All</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <EditLiveSessionDialog session={session} users={users} />
                      <DeleteLiveSessionAction session={session} />
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
  )
}
