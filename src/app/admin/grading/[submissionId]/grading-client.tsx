
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import type { QuizSubmission, Answer, Question, Option, User, Quiz, Course } from "@prisma/client";

type FullAnswer = Answer & {
    question: Question & {
        options: Option[];
    };
};

type FullSubmission = QuizSubmission & {
    user: User;
    quiz: Quiz & {
        course: Course;
    };
    answers: FullAnswer[];
};

type GradingClientProps = {
    submission: FullSubmission;
};

export function GradingClient({ submission }: GradingClientProps) {

    const getAnswerDisplay = (answer: FullAnswer) => {
        if (answer.question.type === "MULTIPLE_CHOICE" || answer.question.type === "TRUE_FALSE") {
            const selectedOption = answer.question.options.find(o => o.id === answer.selectedOptionId);
            return selectedOption?.text || <span className="text-muted-foreground italic">No answer</span>;
        }
        return answer.answerText || <span className="text-muted-foreground italic">No answer</span>;
    }

     const getCorrectAnswerDisplay = (question: Question & { options: Option[] }) => {
        if (question.type === "MULTIPLE_CHOICE" || question.type === "TRUE_FALSE") {
            const correctOption = question.options.find(o => o.id === question.correctAnswerId);
            return correctOption?.text || <span className="text-destructive">Error: Correct answer not found</span>;
        }
        return question.correctAnswerId;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Grade Submission</h1>
                <p className="text-muted-foreground">
                    Review {submission.user.name}'s answers for the "{submission.quiz.course.title}" quiz.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    {submission.answers.map((answer, index) => (
                        <Card key={answer.id}>
                            <CardHeader>
                                <CardTitle>Question {index + 1}: {answer.question.text}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground">Student's Answer</h4>
                                    <p className="p-4 bg-muted/50 rounded-md mt-1">{getAnswerDisplay(answer)}</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-muted-foreground">Correct Answer</h4>
                                    <p className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md mt-1">{getCorrectAnswerDisplay(answer.question)}</p>
                                </div>
                                <div className="flex justify-end gap-2 pt-4 border-t">
                                     <Button variant="outline" size="sm"><X className="h-4 w-4 mr-2"/>Mark Incorrect</Button>
                                     <Button variant="outline" size="sm"><Check className="h-4 w-4 mr-2"/>Mark Correct</Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
                <div className="lg:col-span-1">
                     <Card className="sticky top-20">
                        <CardHeader>
                            <CardTitle>Grading Summary</CardTitle>
                            <CardDescription>Finalize the grade for this submission.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Auto-graded Score</span>
                                <span className="font-bold">0 / {submission.answers.length}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Manual Score</span>
                                <span className="font-bold">0 / {submission.answers.filter(a => a.question.type === 'SHORT_ANSWER' || a.question.type === 'FILL_IN_THE_BLANK').length}</span>
                            </div>
                             <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
                                <span>Final Score</span>
                                <span>0%</span>
                            </div>
                        </CardContent>
                        <CardContent>
                             <Button className="w-full">
                                Finalize and Post Grade
                             </Button>
                        </CardContent>
                     </Card>
                </div>
            </div>
        </div>
    )
}
