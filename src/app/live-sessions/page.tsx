
"use client"

import { useState, useEffect } from "react"
import { liveSessions as initialLiveSessions, type LiveSession, users } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Mic, Video, Radio, Sparkles, CheckSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast";

const SESSIONS_STORAGE_KEY = "skillup-live-sessions"

const SessionCard = ({ session, onAttend, hasAttended }: { session: LiveSession, onAttend: (sessionId: string) => void, hasAttended: boolean }) => {
    const now = new Date();
    const sessionTime = new Date(session.dateTime);
    const endTime = new Date(sessionTime.getTime() + 60 * 60 * 1000); // Assuming 1-hour duration

    const isPast = now > endTime;
    const isLive = now >= sessionTime && now <= endTime;
    const isUpcoming = now < sessionTime;
    
    return (
        <Card className="flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="w-fit mb-2">{session.platform}</Badge>
                {isPast ? (
                    <Badge variant="outline">Past</Badge>
                ) : isLive ? (
                    <Badge variant="destructive" className="animate-pulse">
                        <Radio className="mr-1 h-3 w-3"/>
                        Live Now
                    </Badge>
                ) : (
                    <Badge variant="secondary">
                        Upcoming
                    </Badge>
                )}
              </div>
              <CardTitle className="font-headline text-xl pt-2">{session.title}</CardTitle>
              <CardDescription>{session.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-3">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4"/>
                  <span>{new Date(session.dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4"/>
                  <span>{new Date(session.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
                <div>
                    <h4 className="font-semibold mb-1">Key Takeaways:</h4>
                    <p className="text-sm text-muted-foreground">{session.keyTakeaways}</p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-stretch">
                {isPast ? (
                    session.recordingUrl ? (
                         <Button asChild>
                            <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="mr-2 h-4 w-4" />
                                Watch Recording
                            </a>
                        </Button>
                    ) : (
                         <Button variant="outline" disabled>
                            Recording Unavailable
                        </Button>
                    )
                ) : (
                     <Button asChild>
                        <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                            <Mic className="mr-2 h-4 w-4" />
                            Join Session
                        </a>
                    </Button>
                )}
                {!isUpcoming && (
                     <Button variant="secondary" onClick={() => onAttend(session.id)} disabled={hasAttended}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        {hasAttended ? "Attendance Marked" : "I Attended"}
                    </Button>
                )}
            </CardFooter>
          </Card>
    )
}

export default function LiveSessionsPage() {
    const [sessions, setSessions] = useState<LiveSession[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);
    // Hard-coding staff user for simplicity, in a real app this would come from auth context
    const staffUser = users.find(u => u.role === 'staff')!; 
    const { toast } = useToast();
    
    useEffect(() => {
        const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
        const allSessions = storedSessions ? JSON.parse(storedSessions).map((s: any) => ({...s, dateTime: new Date(s.dateTime)})) : initialLiveSessions;
        setSessions(allSessions);
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if(isLoaded) {
            localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
        }
    }, [sessions, isLoaded]);

    const handleAttend = (sessionId: string) => {
        setSessions(prevSessions => {
            let attendanceMarked = false;
            const newSessions = prevSessions.map(session => {
                if (session.id === sessionId) {
                    const attendees = session.attendees || [];
                    if (!attendees.includes(staffUser.id)) {
                        attendanceMarked = true;
                        return { ...session, attendees: [...attendees, staffUser.id] };
                    }
                }
                return session;
            });

            if (attendanceMarked) {
                toast({ title: "Attendance Marked", description: "Your attendance has been recorded." });
            }

            return newSessions;
        });
    }

    const now = new Date();
    const upcomingSessions = sessions.filter((s: LiveSession) => {
        const endTime = new Date(new Date(s.dateTime).getTime() + 60 * 60 * 1000); // 1 hour duration
        return now < endTime;
    }).sort((a: LiveSession, b: LiveSession) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    const pastSessions = sessions.filter((s: LiveSession) => {
        const endTime = new Date(new Date(s.dateTime).getTime() + 60 * 60 * 1000); // 1 hour duration
        return now > endTime;
    }).sort((a: LiveSession, b: LiveSession) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    if (!isLoaded) {
      return <div>Loading sessions...</div>;
    }

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
                            onAttend={handleAttend}
                            hasAttended={session.attendees?.includes(staffUser.id) || false}
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
                            onAttend={handleAttend}
                            hasAttended={session.attendees?.includes(staffUser.id) || false}
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
