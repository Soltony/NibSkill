
import prisma from "@/lib/db"
import { Radio, Video, Sparkles } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { SessionCard } from "./session-card-client";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

async function getLiveSessionsData(userId: string) {
  const sessions = await prisma.liveSession.findMany({
    include: {
      attendedBy: {
        where: {
          userId: userId,
        },
      },
      allowedAttendees: {
        select: {
            userId: true
        }
      }
    },
  });

  return { sessions, userId };
}

export default async function LiveSessionsPage() {
    const user = await getSession();
    if (!user) {
        redirect('/login');
    }

    const { sessions, userId } = await getLiveSessionsData(user.id);

    const now = new Date();
    const upcomingSessions = sessions.filter((s) => new Date(s.dateTime) >= now)
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const pastSessions = sessions.filter((s) => new Date(s.dateTime) < now)
        .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Live Training</h1>
        <p className="text-muted-foreground">
          Engage with experts in real-time, or catch up on past recordings.
        </p>
      </div>

       <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">
                <Radio className="mr-2 h-4 w-4"/>
                Upcoming Sessions
            </TabsTrigger>
            <TabsTrigger value="past">
                <Video className="mr-2 h-4 w-4"/>
                Past Recordings
            </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming">
            {upcomingSessions.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                    {upcomingSessions.map(session => {
                        const isAllowed = !session.isRestricted || session.allowedAttendees.some(attendee => attendee.userId === userId);
                        return (
                            <SessionCard 
                                key={session.id} 
                                session={session} 
                                userId={userId}
                                hasAttended={session.attendedBy.length > 0}
                                isAllowed={isAllowed}
                            />
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg mt-6">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                    <p className="text-lg font-medium">No upcoming sessions scheduled.</p>
                    <p>Check back soon for new live training opportunities!</p>
                </div>
            )}
        </TabsContent>
        <TabsContent value="past">
             {pastSessions.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
                    {pastSessions.map(session => {
                         const isAllowed = !session.isRestricted || session.allowedAttendees.some(attendee => attendee.userId === userId);
                         return (
                            <SessionCard 
                                key={session.id} 
                                session={session} 
                                userId={userId}
                                hasAttended={session.attendedBy.length > 0}
                                isAllowed={isAllowed}
                            />
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg mt-6">
                    <p className="text-lg font-medium">No past recordings available yet.</p>
                    <p>Once a live session has ended, the recording will appear here.</p>
                </div>
            )}
        </TabsContent>
        </Tabs>
    </div>
  );
}
