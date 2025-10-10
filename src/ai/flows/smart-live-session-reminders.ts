'use server';
/**
 * @fileOverview A smart live session reminder AI agent.
 *
 * - generateSmartReminder - A function that generates smart reminders for live sessions.
 * - SmartReminderInput - The input type for the generateSmartReminder function.
 * - SmartReminderOutput - The return type for the generateSmartReminder function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SmartReminderInputSchema = z.object({
  sessionTitle: z.string().describe('The title of the live training session.'),
  sessionDescription: z.string().describe('A detailed description of the session content.'),
  speakerName: z.string().describe('The name of the speaker for the live session.'),
  keyTakeaways: z.string().describe('A list of key learning points attendees will gain.'),
  time: z.string().describe('The time of the session.'),
});
export type SmartReminderInput = z.infer<typeof SmartReminderInputSchema>;

const SmartReminderOutputSchema = z.object({
  reminderContent: z.string().describe('The tailored content of the reminder message.'),
});
export type SmartReminderOutput = z.infer<typeof SmartReminderOutputSchema>;

export async function generateSmartReminder(input: SmartReminderInput): Promise<SmartReminderOutput> {
  return generateSmartReminderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'smartReminderPrompt',
  input: {schema: SmartReminderInputSchema},
  output: {schema: SmartReminderOutputSchema},
  prompt: `You are an AI assistant designed to create engaging reminder messages for upcoming training sessions.

  Given the following information about a live session, create a reminder message that will encourage staff to attend. The reminder should highlight the benefits of attending and create a sense of anticipation.

  Session Title: {{{sessionTitle}}}
  Session Description: {{{sessionDescription}}}
  Speaker: {{{speakerName}}}
  Key Takeaways: {{{keyTakeaways}}}
  Time: {{{time}}}

  Compose a short reminder message:
  `, // Ensure that the value for the prompt key is a string.
});

const generateSmartReminderFlow = ai.defineFlow(
  {
    name: 'generateSmartReminderFlow',
    inputSchema: SmartReminderInputSchema,
    outputSchema: SmartReminderOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
