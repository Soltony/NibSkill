
"use client"

import { useState } from "react";
import type { LiveSession as SessionType, UserAttendedLiveSession } from "@prisma/client";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, Mic, Video, Radio, CheckSquare, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { markAttendance } from "../actions/live-session-actions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

type SessionWithAttendance = SessionType & { attendedBy: UserAttendedLiveSession[] };

type SessionCardProps = {
    session: SessionWithAttendance;
    userId: string;
    hasAttended: boolean;
    isAllowed: boolean;
}

export const SessionCard = ({ session, userId, hasAttended: initialHasAttended, isAllowed }: SessionCardProps) => {
    const { toast } = useToast();
    const [hasAttended, setHasAttended] = useState(initialHasAttended);

    const now = new Date();
    const sessionTime = new Date(session.dateTime);
    const endTime = new Date(sessionTime.getTime() + 60 * 60 * 1000); // Assuming 1-hour duration

    const isPast = now > endTime;
    const isLive = now >= sessionTime && now <= endTime;
    
    const handleAttend = async (sessionId: string) => {
        if (hasAttended) return;

        const result = await markAttendance(sessionId, userId);
        if (result.success) {
            setHasAttended(true);
            toast({ title: "Attendance Marked", description: "Your attendance has been recorded." });
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    }

    return (
        <Card className={cn("flex flex-col", !isAllowed && "bg-muted/50 border-dashed")}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="w-fit mb-2">{session.platform.replace('_', ' ')}</Badge>
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
                  <span>{format(new Date(session.dateTime), 'PPPP')}</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4"/>
                  <span>{format(new Date(session.dateTime), 'p')}</span>
               </div>
                <div>
                    <h4 className="font-semibold mb-1">Key Takeaways:</h4>
                    <p className="text-sm text-muted-foreground">{session.keyTakeaways}</p>
                </div>
                 {session.isRestricted && (
                    <div className={cn("flex items-center gap-2 text-sm", isAllowed ? "text-muted-foreground" : "text-yellow-600 dark:text-yellow-400")}>
                        <Lock className="h-4 w-4" />
                        <span>{isAllowed ? "You are invited to this restricted session." : "This is a restricted session."}</span>
                    </div>
                )}
            </CardContent>
            <CardFooter className="flex flex-col gap-2 items-stretch">
                {isPast ? (
                    session.recordingUrl && isAllowed ? (
                         <Button asChild>
                            <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer">
                                <Video className="mr-2 h-4 w-4" />
                                Watch Recording
                            </a>
                        </Button>
                    ) : (
                         <Button variant="outline" disabled>
                            {session.recordingUrl ? 'Recording Restricted' : 'Recording Unavailable'}
                        </Button>
                    )
                ) : (
                     <Button asChild disabled={!isAllowed}>
                        <a href={isAllowed ? session.joinUrl : undefined} target="_blank" rel="noopener noreferrer">
                            <Mic className="mr-2 h-4 w-4" />
                            {isAllowed ? 'Join Session' : 'Session Restricted'}
                        </a>
                    </Button>
                )}
                {!isPast && isAllowed && (
                     <Button variant="secondary" onClick={() => handleAttend(session.id)} disabled={hasAttended}>
                        <CheckSquare className="mr-2 h-4 w-4" />
                        {hasAttended ? "Attendance Marked" : "I Attended"}
                    </Button>
                )}
            </CardFooter>
          </Card>
    )
}
