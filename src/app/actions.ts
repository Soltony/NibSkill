"use server";

import { generateSmartReminder, type SmartReminderInput } from "@/ai/flows/smart-live-session-reminders";

export async function handleGenerateReminder(
  input: SmartReminderInput
): Promise<{ reminderContent: string } | { error: string }> {
  try {
    const result = await generateSmartReminder(input);
    return { reminderContent: result.reminderContent };
  } catch (e) {
    console.error(e);
    return { error: "Failed to generate reminder. Please try again." };
  }
}
