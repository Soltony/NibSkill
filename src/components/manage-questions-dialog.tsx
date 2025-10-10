
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
  type: z.enum(['multiple-choice', 'true-false', 'fill-in-the-blank']),
  options: z.array(optionSchema),
  correctAnswerId: z.string({ required_error: "A correct answer is required." }),
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

  const { fields, append, remove, update } = useFieldArray({
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

  const addQuestion = (type: 'multiple-choice' | 'true-false' | 'fill-in-the-blank') => {
    let newQuestion: z.infer<typeof questionSchema>;
    const questionId = `q-${Date.now()}`;

    switch (type) {
      case 'multiple-choice':
        newQuestion = {
          id: questionId,
          text: "",
          type: 'multiple-choice',
          options: [
            { id: `o-${Date.now()}-1`, text: "" },
            { id: `o-${Date.now()}-2`, text: "" },
          ],
          correctAnswerId: "",
        };
        break;
      case 'true-false':
        newQuestion = {
          id: questionId,
          text: "",
          type: 'true-false',
          options: [
            { id: 'true', text: 'True' },
            { id: 'false', text: 'False' },
          ],
          correctAnswerId: "",
        };
        break;
      case 'fill-in-the-blank':
        newQuestion = {
          id: questionId,
          text: "",
          type: 'fill-in-the-blank',
          options: [],
          correctAnswerId: "", // This will hold the correct answer text
        };
        break;
    }
    append(newQuestion);
  }

  const addOption = (questionIndex: number) => {
    const question = form.getValues(`questions.${questionIndex}`);
    if (question.type === 'multiple-choice') {
      const newOptions = [...question.options, { id: `o-${Date.now()}`, text: "" }];
      update(questionIndex, { ...question, options: newOptions });
    }
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = form.getValues(`questions.${questionIndex}`);
    if (question.type === 'multiple-choice') {
      const newOptions = question.options.filter((_, i) => i !== optionIndex);
      update(questionIndex, { ...question, options: newOptions });
    }
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
            Add, edit, or remove questions for this quiz. Select a question type to begin.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="h-[60vh] p-4 border rounded-md">
              <div className="space-y-8">
                {fields.map((question, qIndex) => (
                  <div key={question.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/20 group">
                     <FormField
                      control={form.control}
                      name={`questions.${qIndex}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question {qIndex + 1} ({question.type.replace('-', ' ')})</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter question text" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {question.type === 'multiple-choice' && (
                      <Controller
                          control={form.control}
                          name={`questions.${qIndex}.correctAnswerId`}
                          render={({ field: controllerField }) => (
                              <RadioGroup
                                  onValueChange={controllerField.onChange}
                                  value={controllerField.value}
                                  className="space-y-2"
                              >
                                  {(form.watch(`questions.${qIndex}.options`)).map((option, oIndex) => (
                                      <div key={option.id} className="flex items-center gap-2 group/option">
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
                                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/option:opacity-100" onClick={() => removeOption(qIndex, oIndex)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                          </Button>
                                      </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" onClick={() => addOption(qIndex)}>
                                    <PlusCircle className="mr-2 h-4 w-4"/> Add Option
                                  </Button>
                              </RadioGroup>
                          )}
                      />
                    )}

                    {question.type === 'true-false' && (
                       <Controller
                          control={form.control}
                          name={`questions.${qIndex}.correctAnswerId`}
                          render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="true" id={`${question.id}-true`}/>
                                  <Label htmlFor={`${question.id}-true`} className="font-normal">True</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="false" id={`${question.id}-false`}/>
                                  <Label htmlFor={`${question.id}-false`} className="font-normal">False</Label>
                                </div>
                            </RadioGroup>
                          )}
                        />
                    )}

                    {question.type === 'fill-in-the-blank' && (
                       <FormField
                          control={form.control}
                          name={`questions.${qIndex}.correctAnswerId`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Correct Answer</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter the correct answer" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    )}

                    <FormMessage>{form.formState.errors.questions?.[qIndex]?.correctAnswerId?.message}</FormMessage>

                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => remove(qIndex)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                {fields.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No questions have been added yet.</p>
                )}

                <div className="flex justify-center gap-2">
                  <Button type="button" variant="outline" onClick={() => addQuestion('multiple-choice')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Multiple Choice
                  </Button>
                   <Button type="button" variant="outline" onClick={() => addQuestion('true-false')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> True/False
                  </Button>
                   <Button type="button" variant="outline" onClick={() => addQuestion('fill-in-the-blank')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Fill in the Blank
                  </Button>
                </div>

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
