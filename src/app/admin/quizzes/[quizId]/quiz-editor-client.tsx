
"use client"

import { useEffect } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { updateQuiz } from "@/app/actions/quiz-actions"
import type { Quiz, Question, Option as OptionType, QuizType as PrismaQuizType } from "@prisma/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"

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
  weight: z.coerce.number().min(0.1, "Weight must be greater than 0."),
})

const formSchema = z.object({
  passingScore: z.coerce.number().min(0).max(100),
  timeLimit: z.coerce.number().min(0),
  quizType: z.enum(["OPEN_LOOP", "CLOSED_LOOP"], { required_error: "Required" }),
  questions: z.array(questionSchema),
})

type QuizEditorProps = {
  quiz: QuizWithRelations
  courseTitle: string
}

export function QuizEditor({ quiz, courseTitle }: QuizEditorProps) {
  const router = useRouter();
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "questions",
  })
  
  useEffect(() => {
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
        weight: q.weight || 1,
      };
    });

    form.reset({
      passingScore: quiz.passingScore,
      timeLimit: quiz.timeLimit || 0,
      quizType: quiz.quizType,
      questions: questionsWithCorrectAnswerHandling,
    })
  }, [quiz, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateQuiz(quiz.id, values);
    if (result.success) {
      toast({
        title: "Quiz Updated",
        description: "The questions and settings have been saved.",
      })
      router.push("/admin/quizzes");
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
          weight: 1,
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
          weight: 1,
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
          weight: 1,
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
    <div className="space-y-8">
        <div>
            <h1 className="text-3xl font-bold font-headline">Manage Quiz</h1>
            <p className="text-muted-foreground">Editing quiz for "{courseTitle}"</p>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Questions</CardTitle>
                            <CardDescription>Add, edit, or remove questions for this quiz.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {fields.map((question, qIndex) => (
                            <div key={question.id || qIndex} className="p-4 border rounded-lg space-y-4 relative bg-muted/20 group">
                                <div className="grid grid-cols-1 md:grid-cols-[1fr_100px] gap-4">
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
                                <FormField
                                    control={form.control}
                                    name={`questions.${qIndex}.weight`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Weight</FormLabel>
                                        <FormControl>
                                        <Input type="number" step="0.1" min="0.1" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>

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

                             <div className="flex justify-center gap-2 pt-4 border-t">
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
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>Quiz Settings</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
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
                                            className="flex flex-col space-y-2"
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
                             <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
          </form>
        </Form>
    </div>
  )
}
