
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "./ui/checkbox"
import { ScrollArea } from "./ui/scroll-area"
import { updateLearningPath } from "@/app/actions/learning-path-actions"
import type { LearningPath, Course } from "@prisma/client"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  courseIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one course.",
  }),
})

type EditLearningPathDialogProps = {
  learningPath: LearningPath & { courses: Course[] }
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
      courseIds: learningPath.courses.map(c => c.id),
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        title: learningPath.title,
        description: learningPath.description ?? "",
        courseIds: learningPath.courses.map(c => c.id),
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
      <DialogContent className="sm:max-w-lg">
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
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Courses</FormLabel>
                  </div>
                  <ScrollArea className="h-48 rounded-md border p-4">
                    {courses.map((course) => (
                      <FormField
                        key={course.id}
                        control={form.control}
                        name="courseIds"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={course.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(course.id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([
                                          ...(field.value || []),
                                          course.id,
                                        ])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== course.id
                                          )
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {course.title}
                              </FormLabel>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </ScrollArea>
                  <FormMessage />
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
