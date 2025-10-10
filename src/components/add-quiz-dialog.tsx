
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PlusCircle } from "lucide-react"
import type { Course, Quiz } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  courseId: z.string({ required_error: "Please select a course." }),
})

type AddQuizDialogProps = {
  courses: Course[]
  quizzes: Quiz[]
  onQuizAdded: (quiz: Quiz) => void
}

export function AddQuizDialog({ courses, quizzes, onQuizAdded }: AddQuizDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  // Filter out courses that already have a quiz
  const availableCourses = courses.filter(c => !quizzes.some(q => q.courseId === c.id))

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const newQuiz: Quiz = {
      id: `quiz-${Date.now()}`,
      courseId: values.courseId,
      questions: [],
    }
    onQuizAdded(newQuiz)
    toast({
      title: "Quiz Created",
      description: `A new quiz has been created. You can now add questions.`,
    })
    setOpen(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Quiz</DialogTitle>
          <DialogDescription>
            Select a course to associate this new quiz with.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a course without a quiz" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {availableCourses.length > 0 ? (
                                availableCourses.map(course => (
                                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                                ))
                            ) : (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">All courses have quizzes.</div>
                            )}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={availableCourses.length === 0}>Create Quiz</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
