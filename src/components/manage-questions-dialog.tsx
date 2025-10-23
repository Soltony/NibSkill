
"use client"

import { useState, useEffect } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { RadioGroup, RadioGroupItem } from "./ui/radio-group"
import { Label } from "./ui/label"
import { ScrollArea } from "./ui/scroll-area"
import { updateQuiz } from "@/app/actions/quiz-actions"
import type { Quiz, Question, Option as OptionType, QuizType } from "@prisma/client"

type QuizWithRelations = Quiz & {
  questions: (Question & { options: OptionType[] })[]
}

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Option text cannot be empty."),
})

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Question text cannot be empty."),
  type: z.enum(['multiple_choice', 'true_false', 'fill_in_the_blank', 'short_answer']),
  options: z.array(optionSchema),
  correctAnswerId: z.string().min(1, "A correct answer is required."),
})

const formSchema = z.object({
  passingScore: z.coerce.number().min(0).max(100),
  timeLimit: z.coerce.number().min(0),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"], { required_error: "Required" }),
  questions: z.array(questionSchema),
})

type ManageQuestionsDialogProps = {
  quiz: QuizWithRelations
  courseTitle: string
}

export function ManageQuestionsDialog({ quiz, courseTitle }: ManageQuestionsDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  })
  
  useEffect(() => {
    if (open) {
      const questionsWithCorrectAnswerHandling = quiz.questions.map(q => {
        let correctAnswerValue = '';
        if (q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') {
          correctAnswerValue = q.options.find(opt => opt.id === q.correctAnswerId)?.text || '';
        } else {
          correctAnswerValue = q.correctAnswerId || '';
        }
        return {
          ...q,
          type: q.type.toLowerCase() as 'multiple_choice' | 'true_false' | 'fill_in_the_blank' | 'short_answer',
          options: q.options || [],
          correctAnswerId: correctAnswerValue,
        };
      });

      form.reset({
        passingScore: quiz.passingScore,
        timeLimit: quiz.timeLimit || 0,
        quizType: quiz.quizType,
        questions: questionsWithCorrectAnswerHandling,
      })
    }
  }, [open, quiz, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateQuiz(quiz.id, values);
    if (result.success) {
      toast({
        title: "Quiz Updated",
        description: "The questions and settings have been saved.",
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

  const addQuestion = (type: 'multiple_choice' | 'true_false' | 'fill_in_the_blank' | 'short_answer') => {
    let newQuestion: z.infer<typeof questionSchema>;

    switch (type) {
      case 'multiple_choice':
        newQuestion = {
          id: undefined,
          text: "",
          type: 'multiple_choice',
          options: [
            { id: undefined, text: "" },
            { id: undefined, text: "" },
          ],
          correctAnswerId: "",
        };
        break;
      case 'true_false':
        newQuestion = {
          id: undefined,
          text: "",
          type: 'true_false',
          options: [
            { id: undefined, text: 'True' },
            { id: undefined, text: 'False' },
          ],
          correctAnswerId: "True",
        };
        break;
      case 'fill_in_the_blank':
      case 'short_answer':
        newQuestion = {
          id: undefined,
          text: "",
          type: type,
          options: [],
          correctAnswerId: "",
        };
        break;
    }
    append(newQuestion);
  }

  const addOption = (questionIndex: number) => {
    const question = form.getValues(`questions.${questionIndex}`);
    if (question.type === 'multiple_choice') {
      const newOptions = [...question.options, { id: undefined, text: "" }];
      update(questionIndex, { ...question, options: newOptions });
    }
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const question = form.getValues(`questions.${questionIndex}`);
    if (question.type === 'multiple_choice') {
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
            <div className="mb-6 space-y-4">
                 <FormField
                    control={form.control}
                    name="quizType"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Quiz Type</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                value={field.value}
                                className="flex items-center space-x-4"
                                >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="CLOSED_LOOP" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                        Graded (Closed Loop)
                                    </FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="OPEN_LOOP" />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                       Practice (Open Loop)
                                    </FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="passingScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Passing Score (%)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" {...field} />
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
                      <FormLabel>Time Limit (minutes)</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="0 for none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <ScrollArea className="h-[50vh] p-4 border rounded-md">
              <div className="space-y-8">
                {fields.map((question, qIndex) => (
                  <div key={question.id || qIndex} className="p-4 border rounded-lg space-y-4 relative bg-muted/20 group">
                     <FormField
                      control={form.control}
                      name={`questions.${qIndex}.text`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question {qIndex + 1} ({question.type?.replace(/_/g, ' ')})</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter question text" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {question.type === 'multiple_choice' && (
                      <Controller
                          control={form.control}
                          name={`questions.${qIndex}.correctAnswerId`}
                          render={({ field: controllerField }) => (
                              <RadioGroup
                                  onValueChange={controllerField.onChange}
                                  value={controllerField.value}
                                  className="space-y-2"
                              >
                                  <FormLabel>Options (select the correct one)</FormLabel>
                                  {(form.watch(`questions.${qIndex}.options`) || []).map((option, oIndex) => (
                                      <div key={option.id || oIndex} className="flex items-center gap-2 group/option">
                                          <RadioGroupItem value={option.text} id={`${qIndex}-${oIndex}`} />
                                          <Label htmlFor={`${qIndex}-${oIndex}`} className="font-normal flex-1 cursor-pointer">
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

                    {question.type === 'true_false' && (
                       <Controller
                          control={form.control}
                          name={`questions.${qIndex}.correctAnswerId`}
                          render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4">
                                <FormLabel>Correct Answer:</FormLabel>
                                {(form.watch(`questions.${qIndex}.options`) || []).map(option => (
                                  <div key={option.text} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.text} id={`${qIndex}-${option.text}`}/>
                                    <Label htmlFor={`${qIndex}-${option.text}`} className="font-normal">{option.text}</Label>
                                  </div>
                                ))}
                            </RadioGroup>
                          )}
                        />
                    )}

                    {(question.type === 'fill_in_the_blank' || question.type === 'short_answer') && (
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
                    
                    <FormField
                      control={form.control}
                      name={`questions.${qIndex}.correctAnswerId`}
                      render={() => (
                          <FormMessage />
                      )}
                    />


                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => remove(qIndex)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                
                {fields.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No questions have been added yet.</p>
                )}

                <div className="flex justify-center gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => addQuestion('multiple_choice')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Multiple Choice
                  </Button>
                   <Button type="button" variant="outline" onClick={() => addQuestion('true_false')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> True/False
                  </Button>
                   <Button type="button" variant="outline" onClick={() => addQuestion('fill_in_the_blank')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Fill in the Blank
                  </Button>
                   <Button type="button" variant="outline" onClick={() => addQuestion('short_answer')}>
                    <PlusCircle className="mr-2 h-4 w-4" /> Short Answer
                  </Button>
                </div>

              </div>
            </ScrollArea>
            <DialogFooter className="mt-4">
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
