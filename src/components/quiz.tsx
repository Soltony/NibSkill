

"use client";

import { useState, useEffect, useCallback, useTransition, Fragment } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from './ui/input';
import { Award, Frown, BookCopy, AlertTriangle, ChevronLeft, ChevronRight, Loader2, Hourglass } from 'lucide-react';
import type { Quiz as TQuiz, Question, Option as TOption } from '@prisma/client';
import { Progress } from './ui/progress';
import { completeCourse } from '@/app/actions/user-actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { createSubmission } from '@/app/actions/submission-actions';

type QuizType = TQuiz & { questions: (Question & { options: TOption[] })[] };

type Answer = string | string[];

type Answers = {
  [questionId: string]: Answer;
};

export function Quiz({ quiz, userId, onComplete }: { quiz: QuizType, userId: string, onComplete: () => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isUnderReview, setIsUnderReview] = useState(false);
  const { toast } = useToast();

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const handleSubmit = useCallback(() => {
    if (quiz.requiresManualGrading) {
        setIsUnderReview(true);
        startTransition(async () => {
            await createSubmission({
                userId,
                quizId: quiz.id,
                answers: answers
            });
        });
        setShowResult(true);
        return;
    }

    let totalWeight = 0;
    let earnedWeight = 0;

    quiz.questions.forEach((q) => {
        const questionWeight = q.weight || 1;
        totalWeight += questionWeight;

        let isCorrect = false;
        if (q.type === 'FILL_IN_THE_BLANK' || q.type === 'SHORT_ANSWER') {
            const correctAnswer = (q.correctAnswerId || "").trim().toLowerCase();
            const userAnswer = ((answers[q.id] as string) || "").trim().toLowerCase();
            if (correctAnswer === userAnswer) {
                isCorrect = true;
            }
        } else {
            const correctOption = q.options.find(opt => opt.id === q.correctAnswerId);
            if (correctOption && answers[q.id] === correctOption.id) {
                isCorrect = true;
            }
        }
        if (isCorrect) {
            earnedWeight += questionWeight;
        }
    });

    const finalScore = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
    setScore(finalScore);
    setShowResult(true);

    if (finalScore >= quiz.passingScore) {
        startTransition(async () => {
            const result = await completeCourse({
                userId,
                courseId: quiz.courseId,
                score: finalScore,
            });

            if (!result.success) {
                toast({
                title: "Error Saving Completion",
                description: result.message,
                variant: "destructive"
                })
            }
        });
    }
  }, [answers, quiz, userId, toast]);
  
  useEffect(() => {
    if (timeLeft === null || showResult) return;

    if (timeLeft <= 0) {
        handleSubmit();
        return;
    }

    const timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime !== null ? prevTime - 1 : null);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, handleSubmit, showResult]);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const isAnswered = (q: Question) => {
    const answer = answers[q.id];
    if (q.type === 'FILL_IN_THE_BLANK' || q.type === 'SHORT_ANSWER') {
      return answer && (answer as string).trim() !== '';
    }
    return answer && (answer as string).trim() !== '';
  };

  const allQuestionsAnswered = quiz.questions.every(q => isAnswered(q));

  const passed = score >= quiz.passingScore;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  const goToNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent>
          <p>This quiz has no questions.</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <>
      <Card className="w-full max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Knowledge Check</CardTitle>
            <CardDescription>
                Let's see what you've learned. Answer all questions to complete the course. 
                The passing score is {quiz.passingScore}%.
                {quiz.timeLimit && quiz.timeLimit > 0 && ` You have ${quiz.timeLimit} minutes.`}
            </CardDescription>
          </CardHeader>
           <CardContent>
            {quiz.timeLimit && quiz.timeLimit > 0 && timeLeft !== null && (
                <div className="mb-6">
                    <div className="flex justify-between text-sm font-medium mb-1">
                        <span>Time Remaining</span>
                        <span className="font-mono">{formatTime(timeLeft)}</span>
                    </div>
                    <Progress value={(timeLeft / (quiz.timeLimit * 60)) * 100} />
                </div>
            )}
            
             <div className="mb-6">
                <div className="flex justify-between text-sm font-medium mb-1">
                    <span>Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} />
            </div>

            {currentQuestion && (
              <div>
                {(currentQuestion.type === 'MULTIPLE_CHOICE' || currentQuestion.type === 'TRUE_FALSE') && (
                  <>
                    <p className="mb-4 font-semibold text-lg">{currentQuestion.text}</p>
                    <RadioGroup
                        value={(answers[currentQuestion.id] as string) || ''}
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                        className="space-y-2"
                    >
                        {currentQuestion.options.map((opt) => (
                        <div key={opt.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-muted/50 has-[[data-state=checked]]:bg-muted">
                            <RadioGroupItem value={opt.id} id={`${currentQuestion.id}-${opt.id}`} />
                            <Label htmlFor={`${currentQuestion.id}-${opt.id}`} className="font-normal cursor-pointer flex-1">
                            {opt.text}
                            </Label>
                        </div>
                        ))}
                    </RadioGroup>
                  </>
                )}
                 {currentQuestion.type === 'FILL_IN_THE_BLANK' && (
                  <div className="mb-4 font-semibold text-lg leading-relaxed">
                    <span>{currentQuestion.text.split('____')[0]}</span>
                    <Input
                      className="inline-block w-48 h-8 mx-2 px-2 text-base align-baseline"
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    />
                    <span>{currentQuestion.text.split('____')[1]}</span>
                  </div>
                )}
                 {currentQuestion.type === 'SHORT_ANSWER' && (
                  <div className="space-y-2">
                    <p className="mb-4 font-semibold text-lg">{currentQuestion.text}</p>
                    <Textarea
                      placeholder="Type your answer here..."
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      rows={5}
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            {currentQuestionIndex === quiz.questions.length - 1 ? (
              <Button onClick={handleSubmit} disabled={!allQuestionsAnswered}>
                Submit Quiz
              </Button>
            ) : (
              <Button onClick={goToNext}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
      </Card>
      
      <AlertDialog open={showResult} onOpenChange={setShowResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
             {timeLeft !== null && timeLeft <= 0 && (
                 <div className="flex items-center justify-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    <p className="font-bold text-center">Time's Up!</p>
                 </div>
             )}
            <AlertDialogTitle className="font-headline text-center text-2xl">
              {isUnderReview 
                ? "Submission Received" 
                : passed ? "Certification Granted!" : "More Study Needed"
              }
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {isUnderReview
                ? "Your answers have been submitted for review."
                : "You have completed the quiz. Here is your result."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 text-center flex flex-col items-center gap-4">
            {isUnderReview ? (
                <Hourglass className="h-20 w-20 text-primary" />
            ) : passed ? (
                <Award className="h-20 w-20 text-green-500" />
             ) : (
                <Frown className="h-20 w-20 text-red-500" />
             )}
            <div>
              {isUnderReview ? (
                <p className="text-lg text-muted-foreground mt-2">
                  Some questions require manual grading. You will be notified once your results are ready.
                </p>
              ) : (
                <>
                    <p className="text-sm text-muted-foreground">Your Score</p>
                    <p className="text-6xl font-bold text-primary">{score}%</p>
                    <p className="text-sm text-muted-foreground">Passing Score: {quiz.passingScore}%</p>
                    <p className="text-lg text-muted-foreground mt-2">
                        {passed ? "Excellent work! You've successfully passed the assessment." : "Good effort! Please review the materials and try again."}
                    </p>
                </>
              )}
            </div>
          </div>
          <AlertDialogFooter className="sm:justify-center">
            {isUnderReview ? (
                 <Button onClick={() => onComplete()} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookCopy className="mr-2 h-4 w-4" />}
                    Back to Course
                </Button>
            ) : passed ? (
                <Button asChild>
                    <Link href={`/courses/${quiz.courseId}/certificate`}>
                        <Award className="mr-2 h-4 w-4" />
                        View Certificate
                    </Link>
                </Button>
            ) : null }

             {!isUnderReview && (
                <Button variant="outline" onClick={() => onComplete()} disabled={isPending}>
                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BookCopy className="mr-2 h-4 w-4" />}
                    {passed ? 'Back to Course' : 'Review and Retry'}
                </Button>
             )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
