"use client";

import { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { gradeSubmission } from "@/app/actions/submission-actions";

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
    const router = useRouter();
    const { toast } = useToast();
    const [scores, setScores] = useState<Record<string, number>>(() => {
        const initialScores: Record<string, number> = {};
        submission.answers.forEach(answer => {
            if (answer.question.type === 'SHORT_ANSWER' || answer.question.type === 'FILL_IN_THE_BLANK') {
                initialScores[answer.id] = 0;
            }
        });
        return initialScores;
    });

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
    
    const handleScoreChange = (answerId: string, value: string, max: number) => {
        const newScore = Math.max(0, Math.min(parseFloat(value) || 0, max));
        setScores(prev => ({ ...prev, [answerId]: newScore }));
    }
    
    const { autoGradedScore, totalAutoGradedWeight, manualScore, totalManualWeight } = useMemo(() => {
        let autoGradedScore = 0;
        let totalAutoGradedWeight = 0;
        let manualScore = 0;
        let totalManualWeight = 0;

        submission.answers.forEach(answer => {
            const weight = answer.question.weight;
            if (answer.question.type === 'MULTIPLE_CHOICE' || answer.question.type === 'TRUE_FALSE') {
                totalAutoGradedWeight += weight;
                if (answer.selectedOptionId === answer.question.correctAnswerId) {
                    autoGradedScore += weight;
                }
            } else {
                totalManualWeight += weight;
            }
        });

        manualScore = Object.values(scores).reduce((sum, score) => sum + score, 0);

        return { autoGradedScore, totalAutoGradedWeight, manualScore, totalManualWeight };
    }, [submission.answers, scores]);
    
    const totalWeight = totalAutoGradedWeight + totalManualWeight;
    const totalScore = autoGradedScore + manualScore;
    const finalPercentage = totalWeight > 0 ? Math.round((totalScore / totalWeight) * 100) : 0;

    const handleFinalizeGrade = async () => {
        const result = await gradeSubmission({
            submissionId: submission.id,
            finalScore: finalPercentage
        });

        if (result.success) {
            toast({
                title: "Grade Finalized",
                description: "The grade has been posted successfully.",
            });
            router.push('/admin/grading');
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            });
        }
    };


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
                    {submission.answers.map((answer, index) => {
                        const isManual = answer.question.type === 'SHORT_ANSWER' || answer.question.type === 'FILL_IN_THE_BLANK';
                        return (
                             <Card key={answer.id}>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <CardTitle>Question {index + 1}: {answer.question.text}</CardTitle>
                                        <span className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                                            Weight: {answer.question.weight}
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-semibold text-sm text-muted-foreground">Student's Answer</h4>
                                        <p className="p-4 bg-muted/50 rounded-md mt-1">{getAnswerDisplay(answer)}</p>
                                    </div>
                                    {isManual && (
                                        <>
                                            <div>
                                                <h4 className="font-semibold text-sm text-muted-foreground">Correct Answer</h4>
                                                <p className="p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md mt-1">{getCorrectAnswerDisplay(answer.question)}</p>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-4 border-t">
                                                 <div className="flex items-center gap-2">
                                                    <Label htmlFor={`score-${answer.id}`} className="text-sm font-medium">Score</Label>
                                                    <Input
                                                        id={`score-${answer.id}`}
                                                        type="number"
                                                        value={scores[answer.id] || 0}
                                                        onChange={(e) => handleScoreChange(answer.id, e.target.value, answer.question.weight)}
                                                        max={answer.question.weight}
                                                        min={0}
                                                        step={0.5}
                                                        className="w-24"
                                                    />
                                                     <span className="text-muted-foreground text-sm">/ {answer.question.weight}</span>
                                                 </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
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
                                <span className="font-bold">{autoGradedScore.toFixed(1)} / {totalAutoGradedWeight.toFixed(1)}</span>
                            </div>
                             <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Manual Score</span>
                                <span className="font-bold">{manualScore.toFixed(1)} / {totalManualWeight.toFixed(1)}</span>
                            </div>
                             <div className="flex justify-between items-center text-lg font-bold border-t pt-4">
                                <span>Final Score</span>
                                <span>{finalPercentage}%</span>
                            </div>
                        </CardContent>
                        <CardContent>
                             <Button className="w-full" onClick={handleFinalizeGrade}>
                                Finalize and Post Grade
                             </Button>
                        </CardContent>
                     </Card>
                </div>
            </div>
        </div>
    )
}
