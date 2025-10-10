"use client";

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { handleGenerateReminder } from '@/app/actions';
import type { LiveSession } from '@/lib/data';
import { Wand2, Copy, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

export function GenerateReminderDialog({ session }: { session: LiveSession }) {
  const [isOpen, setIsOpen] = useState(false);
  const [reminder, setReminder] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const onGenerate = async () => {
    setIsLoading(true);
    setReminder('');
    
    const input = {
        sessionTitle: session.title,
        sessionDescription: session.description,
        speakerName: session.speaker,
        keyTakeaways: session.keyTakeaways,
        time: session.dateTime.toLocaleString('en-US', {
            weekday: 'long',
            hour: '2-digit',
            minute: '2-digit',
        }),
    };
    
    const result = await handleGenerateReminder(input);
    setIsLoading(false);

    if ('error' in result) {
      toast({
        title: 'Error',
        description: result.error,
        variant: 'destructive',
      });
    } else {
      setReminder(result.reminderContent);
      toast({
        title: 'Reminder Generated',
        description: 'The smart reminder has been successfully created.',
      });
    }
  };

  const onCopy = () => {
    navigator.clipboard.writeText(reminder);
    toast({
      title: 'Copied to Clipboard!',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Wand2 className="mr-2 h-4 w-4" />
          Smart Reminder
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Generate Smart Reminder</DialogTitle>
          <DialogDescription>
            Use AI to generate an engaging reminder message for the session: "{session.title}".
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
            <Button onClick={onGenerate} disabled={isLoading} className="w-full">
                {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Reminder
            </Button>

            {reminder && (
                <div className="space-y-2">
                    <Label htmlFor="reminder-content">Generated Reminder</Label>
                    <Textarea id="reminder-content" value={reminder} readOnly rows={8} />
                </div>
            )}
            
            {isLoading && (
                 <Alert>
                    <Wand2 className="h-4 w-4" />
                    <AlertTitle>Generating...</AlertTitle>
                    <AlertDescription>
                        Our AI is crafting the perfect reminder. This may take a moment.
                    </AlertDescription>
                </Alert>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
          <Button onClick={onCopy} disabled={!reminder}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
