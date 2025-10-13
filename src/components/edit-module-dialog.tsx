

"use client"

import { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Module } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "./ui/textarea"
import { updateModule } from "@/app/actions/module-actions"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  type: z.enum(["video", "pdf", "slides"], { required_error: "Please select a module type." }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  description: z.string().min(10, "Description is required."),
  content: z.string().url("Please enter a valid URL."),
})

type EditModuleDialogProps = {
  module: Module
  onModuleUpdated: (module: Module) => void
  children: React.ReactNode
}

export function EditModuleDialog({ module, onModuleUpdated, children }: EditModuleDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: module.title,
      type: module.type,
      duration: module.duration,
      description: module.description,
      content: module.content,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: module.title,
        type: module.type,
        duration: module.duration,
        description: module.description,
        content: module.content,
      })
    }
  }, [open, module, form])


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateModule(module.id, values);
    
    if (result.success && result.data) {
        const updatedModule: Module = {
            ...module,
            ...result.data,
        }
        onModuleUpdated(updatedModule);
        toast({
            title: "Module Updated",
            description: `The module "${updatedModule.title}" has been updated.`,
        })
        setOpen(false)
    } else {
        toast({
            title: "Error updating module",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Module</DialogTitle>
          <DialogDescription>
            Update the details for this course module.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction to..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea placeholder="A brief description of the module content." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Module Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="pdf">PDF</SelectItem>
                              <SelectItem value="slides">Slides</SelectItem>
                          </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Content URL</FormLabel>
                    <FormControl>
                        <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
