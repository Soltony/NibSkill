
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
import { useToast } from "@/hooks/use-toast"
import { Input } from "./ui/input"
import { addQuiz } from "@/app/actions/quiz-actions"
import type { Course, Quiz } from "@prisma/client"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"

const formSchema = z.object({
  courseId: z.string({ required_error: "Please select a course." }),
  passingScore: z.coerce.number().min(0, "Passing score must be at least 0.").max(100, "Passing score cannot exceed 100."),
  timeLimit: z.coerce.number().min(0, "Time limit must be a positive number or 0 for no limit."),
  maxAttempts: z.coerce.number().min(0, "Max attempts must be a positive number or 0 for unlimited."),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"], { required_error: "Please select a quiz type."}),
})

type AddQuizDialogProps = {
  courses: Course[]
  quizzes: Quiz[]
}

export function AddQuizDialog({ courses, quizzes }: AddQuizDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passingScore: 80,
      timeLimit: 0,
      maxAttempts: 3,
      quizType: "CLOSED_LOOP"
    }
  })

  // Filter out courses that already have a quiz
  const availableCourses = courses.filter(c => !quizzes.some(q => q.courseId === c.id))

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await addQuiz(values);
    if (result.success) {
      toast({
        title: "Quiz Created",
        description: `A new quiz has been created. You can now add questions.`,
      })
      setOpen(false)
      form.reset({ passingScore: 80, timeLimit: 0, courseId: undefined, quizType: "CLOSED_LOOP", maxAttempts: 3 })
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add Quiz
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Quiz</DialogTitle>
          <DialogDescription>
            Select a course and define the quiz settings.
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
             <FormField
                control={form.control}
                name="quizType"
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Quiz Type</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                            >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="CLOSED_LOOP" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    <span className="font-semibold">Closed Loop (Graded)</span>
                                    <p className="text-xs text-muted-foreground">The quiz is graded and counts towards completion.</p>
                                </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                <RadioGroupItem value="OPEN_LOOP" />
                                </FormControl>
                                <FormLabel className="font-normal">
                                    <span className="font-semibold">Open Loop (Non-Graded)</span>
                                    <p className="text-xs text-muted-foreground">A practice quiz for feedback; no grade is assigned.</p>
                                </FormLabel>
                            </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="passingScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Passing Score (%)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="100" placeholder="e.g., 80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeLimit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (min)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0 for none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxAttempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attempts</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0 for unlimited" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || availableCourses.length === 0}>
                {form.formState.isSubmitting ? "Creating..." : "Create Quiz"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
