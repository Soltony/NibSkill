
import prisma from "@/lib/db"
import { Radio, Video, Sparkles } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { SessionCard } from "./session-card-client";

async function getLiveSessionsData() {
  const staffUser = await prisma.user.findFirst({ 
    where: { role: { name: 'Staff' } },
    select: { id: true }
  });

  if (!staffUser) {
    throw new Error("Could not find a staff user. Please seed the database.");
  }
  
  const sessions = await prisma.liveSession.findMany({
    include: {
      attendees: {
        where: {
          userId: staffUser.id,
        },
      },
    },
  });

  return { sessions, userId: staffUser.id };
}

export default async function LiveSessionsPage() {
    const { sessions, userId } = await getLiveSessionsData();

    const now = new Date();
    const upcomingSessions = sessions.filter((s) => {
        const endTime = new Date(new Date(s.dateTime).getTime() + 60 * 60 * 1000); // 1 hour duration
        return now < endTime;
    }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const pastSessions = sessions.filter((s) => {
        const endTime = new Date(new Date(s.dateTime).getTime() + 60 * 60 * 1000); // 1 hour duration
        return now > endTime;
    }).sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

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
                    {upcomingSessions.map(session => (
                        <SessionCard 
                            key={session.id} 
                            session={session} 
                            userId={userId}
                            hasAttended={session.attendees.length > 0}
                        />
                    ))}
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
                    {pastSessions.map(session => (
                        <SessionCard 
                            key={session.id} 
                            session={session} 
                            userId={userId}
                            hasAttended={session.attendees.length > 0}
                        />
                    ))}
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
