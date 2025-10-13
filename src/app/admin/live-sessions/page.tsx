
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

export default async function LiveSessionManagementPage() {
  
  const sessions = await prisma.liveSession.findMany({
    orderBy: {
      dateTime: 'desc'
    },
    include: {
      attendees: {
        include: {
          user: true
        }
      }
    }
  });

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
          <AddLiveSessionDialog />
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
                      <EditLiveSessionDialog session={session} />
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
