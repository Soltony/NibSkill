

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
import { AddLiveSessionDialog, EditLiveSessionDialog, ViewAttendeesDialog, DeleteLiveSessionAction, EndLiveSessionAction } from "./live-session-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { LiveSessionStatus } from "@prisma/client"
import { cn } from "@/lib/utils"

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

  const getStatusVariant = (status: LiveSessionStatus) => {
    switch (status) {
        case 'UPCOMING': return 'secondary';
        case 'LIVE': return 'destructive';
        case 'ENDED': return 'outline';
        default: return 'default';
    }
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
                    <Badge 
                      variant={getStatusVariant(session.status)}
                      className={cn(session.status === 'LIVE' && 'animate-pulse')}
                    >
                      {session.status}
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
                      <EndLiveSessionAction session={session} />
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
