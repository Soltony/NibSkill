
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircle, Wand2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addLiveSession } from "@/app/actions/live-session-actions"

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  speaker: z.string().min(3, "Speaker is required"),
  description: z.string().min(10, "Description is required"),
  keyTakeaways: z.string().min(10, "Key takeaways are required"),
  dateTime: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid date" }),
  platform: z.enum(["Zoom", "Google_Meet"]),
  joinUrl: z.string().url("Must be a valid URL"),
  recordingUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
})


export function AddLiveSessionDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      speaker: "",
      description: "",
      keyTakeaways: "",
      dateTime: "",
      platform: "Zoom",
      joinUrl: "",
      recordingUrl: "",
    },
  })

  const watchedPlatform = form.watch("platform");

  const handleGenerateLink = () => {
    let url = "";
    if (watchedPlatform === "Zoom") {
        const meetingId = Math.floor(1000000000 + Math.random() * 9000000000);
        url = `https://your-company.zoom.us/j/${meetingId}`;
    } else if (watchedPlatform === "Google_Meet") {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        const code = Array.from({ length: 11 }, (_, i) => {
            if (i === 3 || i === 8) return '-';
            return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        url = `https://meet.google.com/${code}`;
    }
    form.setValue("joinUrl", url, { shouldValidate: true });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await addLiveSession(values)
    if (result.success) {
      toast({
        title: "Live Session Added",
        description: `The session "${values.title}" has been created.`,
      })
      setOpen(false)
      form.reset()
    } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Live Session</DialogTitle>
          <DialogDescription>
            Fill in the details to schedule a new live session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., AMA with the CEO" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="speaker"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Speaker</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Doe, CEO" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What is this session about?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="keyTakeaways"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Key Takeaways</FormLabel>
                  <FormControl>
                    <Textarea placeholder="List what attendees will learn." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date and Time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Zoom">Zoom</SelectItem>
                      <SelectItem value="Google_Meet">Google Meet</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joinUrl"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Join URL</FormLabel>
                   <div className="flex gap-2">
                        <FormControl>
                            <Input placeholder="https://..." {...field} />
                        </FormControl>
                        <Button type="button" variant="outline" onClick={handleGenerateLink} disabled={!watchedPlatform}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Generate
                        </Button>
                   </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recordingUrl"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Recording URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="col-span-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
