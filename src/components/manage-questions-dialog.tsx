
"use client"

import { useState } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
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
import { Trash2, PlusCircle } from "lucide-react"
import { type Quiz, type Question } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import { ScrollArea } from "./ui/scroll-area"

const optionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Option text cannot be empty."),
})

const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, "Question text cannot be empty."),
  options: z.array(optionSchema).min(2, "Must have at least two options."),
  correctAnswerId: z.string({ required_error: "Please select a correct answer." }),
})

const formSchema = z.object({
  questions: z.array(questionSchema),
})

type ManageQuestionsDialogProps = {
  quiz: Quiz
  courseTitle: string
  onQuizUpdated: (quiz: Quiz) => void
}

export function ManageQuestionsDialog({ quiz, courseTitle, onQuizUpdated }: ManageQuestionsDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      questions: quiz.questions,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  })

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const updatedQuiz: Quiz = {
      ...quiz,
      questions: values.questions,
    }
    onQuizUpdated(updatedQuiz)
    toast({
      title: "Quiz Updated",
      description: "The questions have been saved.",
    })
    setOpen(false)
  }

  const addQuestion = () => {
    append({
      id: `q-${Date.now()}`,
      text: "",
      options: [
        { id: `o-${Date.now()}-1`, text: "" },
        { id: `o-${Date.now()}-2`, text: "" },
      ],
      correctAnswerId: "",
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Manage Questions</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Questions for "{courseTitle}"</DialogTitle>
          <DialogDescription>
            Add, edit, or remove questions for this quiz.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-4 border rounded-md">
              <div className="space-y-8">
                {fields.map((question, qIndex) => (
                  <div key={question.id} className="p-4 border rounded-lg space-y-4 relative">
                     <FormField
                      control={form.control}
                      name={`questions.${qIndex}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question {qIndex + 1}</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter question text" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Controller
                        control={form.control}
                        name={`questions.${qIndex}.correctAnswerId`}
                        render={({ field: controllerField }) => (
                            <RadioGroup
                                onValueChange={controllerField.onChange}
                                value={controllerField.value}
                                className="space-y-2"
                            >
                                {question.options.map((option, oIndex) => (
                                    <div key={option.id} className="flex items-center gap-2">
                                        <RadioGroupItem value={option.id} id={option.id} />
                                        <Label htmlFor={option.id} className="font-normal flex-1 cursor-pointer">
                                            <FormField
                                                control={form.control}
                                                name={`questions.${qIndex}.options.${oIndex}.text`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormControl>
                                                        <Input placeholder={`Option ${oIndex + 1}`} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        )}
                    />
                    <FormMessage>{form.formState.errors.questions?.[qIndex]?.correctAnswerId?.message}</FormMessage>

                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(qIndex)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addQuestion} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Question
                </Button>
              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
