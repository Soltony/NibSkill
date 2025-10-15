

"use client"

import { useState, useEffect, ChangeEvent } from "react"
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
import { FileUp, X } from "lucide-react"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  type: z.enum(["video", "pdf", "slides", "audio"], { required_error: "Please select a module type." }),
  duration: z.coerce.number().min(1, "Duration must be at least 1 minute."),
  description: z.string().min(10, "Description is required."),
  content: z.string().min(1, "Content is required.").refine(val => val.startsWith('https://') || val.startsWith('data:'), {
    message: "Content must be a valid URL or a file upload.",
  }),
})

type EditModuleDialogProps = {
  module: Module
  onModuleUpdated: (module: Module) => void
  children: React.ReactNode
}

export function EditModuleDialog({ module, onModuleUpdated, children }: EditModuleDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [fileName, setFileName] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })
  
  const watchedType = form.watch('type');

  useEffect(() => {
    if (open) {
      form.reset({
        title: module.title,
        type: module.type,
        duration: module.duration,
        description: module.description,
        content: module.content,
      });

      if (module.content.startsWith('data:')) {
        setFileName('Previously uploaded file');
      } else {
        setFileName(null);
      }
    }
  }, [open, module, form])


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
    const fileInput = document.getElementById('edit-module-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }


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
        setFileName(null);
    } else {
        toast({
            title: "Error updating module",
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

  const getAcceptType = () => {
    switch(watchedType) {
        case 'video': return 'video/*';
        case 'audio': return 'audio/*';
        case 'pdf': return '.pdf';
        case 'slides': return '.ppt, .pptx, .key';
        default: return '';
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                      <Select onValueChange={(value) => { field.onChange(value); form.setValue('content', ''); setFileName(null); }} value={field.value}>
                          <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Select a type" />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="audio">Audio</SelectItem>
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
                        <FormLabel>Content</FormLabel>
                        <FormControl>
                           <Input placeholder="Or paste a URL (e.g., for YouTube)" {...field} disabled={!!fileName} />
                        </FormControl>
                        
                        {fileName ? (
                             <div className="flex items-center justify-between rounded-md border border-input bg-muted p-2">
                                <span className="truncate text-sm pl-2">{fileName}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={removeFile}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                               <div className="w-full border-t border-dashed"></div>
                               <span className="text-xs text-muted-foreground">OR</span>
                               <div className="w-full border-t border-dashed"></div>
                            </div>
                        )}
                        
                        {!fileName && (
                          <Button asChild variant="outline" className="w-full">
                              <label>
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Upload New File
                                  <Input id="edit-module-file-input" type="file" accept={getAcceptType()} className="sr-only" onChange={handleFileUpload} />
                              </label>
                          </Button>
                        )}
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
