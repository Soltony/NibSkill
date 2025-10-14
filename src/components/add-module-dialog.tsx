
"use client"

import { useState, ChangeEvent } from "react"
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
import { PlusCircle, FileUp, X } from "lucide-react"
import type { Module } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "./ui/textarea"
import { addModule } from "@/app/actions/module-actions"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  type: z.enum(["video", "pdf", "slides"], { required_error: "Please select a module type." }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  description: z.string().min(10, "Description is required."),
  content: z.string().min(1, "Content is required."),
})

type AddModuleDialogProps = {
  courseId: string;
  onModuleAdded: (module: Module) => void
}

export function AddModuleDialog({ courseId, onModuleAdded }: AddModuleDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      duration: 10,
      description: "",
      content: "",
      type: "video"
    },
  })

  const watchedType = form.watch('type');

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue("content", dataUrl, { shouldValidate: true });
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setFileName(null);
    form.setValue("content", "", { shouldValidate: true });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await addModule(courseId, values);
    if (result.success && result.data) {
        onModuleAdded(result.data as Module)
        toast({
        title: "Module Added",
        description: `The module "${result.data.title}" has been added.`,
        })
        setOpen(false)
        form.reset()
        setFileName(null);
    } else {
        toast({
            title: "Error adding module",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  const onOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
        form.reset();
        setFileName(null);
    }
    setOpen(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Module
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Module</DialogTitle>
          <DialogDescription>
            Fill in the details for the new course module.
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
                      <Select onValueChange={(value) => { field.onChange(value); form.setValue('content', ''); setFileName(null); }} defaultValue={field.value}>
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
                        <FormLabel>{watchedType === 'video' ? 'Content URL' : 'Content File'}</FormLabel>
                         {watchedType === 'video' ? (
                            <FormControl>
                                <Input placeholder="https://youtube.com/watch?v=..." {...field} />
                            </FormControl>
                         ) : (
                            fileName ? (
                                <div className="flex items-center justify-between rounded-md border border-input bg-background p-2">
                                    <span className="truncate text-sm">{fileName}</span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeFile}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <FormControl>
                                    <Button asChild variant="outline" className="w-full">
                                        <label>
                                            <FileUp className="mr-2 h-4 w-4" />
                                            Upload File
                                            <Input type="file" accept={watchedType === 'pdf' ? '.pdf' : '.ppt, .pptx'} className="sr-only" onChange={handleFileUpload} />
                                        </label>
                                    </Button>
                                </FormControl>
                            )
                         )}
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Adding..." : "Add Module"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
