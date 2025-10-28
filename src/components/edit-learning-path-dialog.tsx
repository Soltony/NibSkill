
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { updateLearningPath } from "@/app/actions/learning-path-actions"
import type { LearningPath, Course } from "@prisma/client"
import { CourseSequenceSelector } from "./course-sequence-selector"
import { Switch } from "./ui/switch"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  courseIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one course.",
  }),
  hasCertificate: z.boolean().default(false),
})

type LearningPathWithCourses = LearningPath & { courses: { course: Course }[] };

type EditLearningPathDialogProps = {
  learningPath: LearningPathWithCourses
  courses: Course[]
}

export function EditLearningPathDialog({ learningPath, courses }: EditLearningPathDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: learningPath.title,
      description: learningPath.description ?? "",
      courseIds: learningPath.courses.map(c => c.course.id),
      hasCertificate: learningPath.hasCertificate,
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: learningPath.title,
        description: learningPath.description ?? "",
        courseIds: learningPath.courses.map(c => c.course.id),
        hasCertificate: learningPath.hasCertificate,
      })
    }
  }, [open, learningPath, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateLearningPath(learningPath.id, values);
    if (result.success) {
      toast({
        title: "Learning Path Updated",
        description: `The path "${values.title}" has been successfully updated.`,
      })
      setOpen(false)
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
        <Button variant="outline" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Learning Path</DialogTitle>
          <DialogDescription>
            Update the details for the learning path below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Path Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New Hire Onboarding" {...field} />
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
                    <Textarea
                      placeholder="A brief summary of what this path covers."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="courseIds"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-2">
                    <FormLabel>Courses</FormLabel>
                  </div>
                   <CourseSequenceSelector
                        allCourses={courses}
                        selectedCourseIds={field.value}
                        onSelectedCourseIdsChange={field.onChange}
                    />
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="hasCertificate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Award a Certificate</FormLabel>
                    <FormDescription>
                      Does this path award a certificate upon completion?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
               <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
