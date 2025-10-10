import { liveSessions } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Clock, User, Mic } from 'lucide-react';
import { GenerateReminderDialog } from '@/components/generate-reminder-dialog';
import { Badge } from '@/components/ui/badge';

export default function LiveSessionsPage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">Live Training Sessions</h1>
        <p className="text-muted-foreground">
          Engage with experts in real-time and get your questions answered.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {liveSessions.map((session) => (
          <Card key={session.id} className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit mb-2">{session.platform}</Badge>
              <CardTitle className="font-headline text-2xl">{session.title}</CardTitle>
              <CardDescription>{session.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4"/>
                  <span>{session.speaker}</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4"/>
                  <span>{session.dateTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
               </div>
               <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4"/>
                  <span>{session.dateTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
               </div>
                <div>
                    <h4 className="font-semibold mb-2">Key Takeaways:</h4>
                    <p className="text-sm text-muted-foreground">{session.keyTakeaways}</p>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <GenerateReminderDialog session={session} />
              <Button asChild>
                <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">
                    <Mic className="mr-2 h-4 w-4" />
                    Join Session
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
