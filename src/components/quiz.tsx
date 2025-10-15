
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Award, Frown, BookCopy, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Quiz as TQuiz, Question, Option as TOption } from '@prisma/client';
import { Progress } from './ui/progress';

type QuizType = TQuiz & { questions: (Question & { options: TOption[] })[] };

type Answers = {
  [questionId: string]: string;
};

export function Quiz({ quiz, onComplete }: { quiz: QuizType, onComplete: () => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const shuffledQuestions = useMemo(() => {
    return [...quiz.questions].sort(() => Math.random() - 0.5);
  }, [quiz.questions]);

  const currentQuestion = shuffledQuestions[currentQuestionIndex];

  const handleSubmit = useCallback(() => {
    let correctAnswers = 0;
    shuffledQuestions.forEach((q) => {
       if (q.type === 'fill_in_the_blank') {
        if (answers[q.id]?.trim().toLowerCase() === q.correctAnswerId.trim().toLowerCase()) {
          correctAnswers++;
        }
      } else {
        const correctOption = q.options.find(opt => opt.id === q.correctAnswerId);
        if (correctOption && answers[q.id] === correctOption.id) {
          correctAnswers++;
        }
      }
    });
    const finalScore = shuffledQuestions.length > 0 ? Math.round((correctAnswers / shuffledQuestions.length) * 100) : 0;
    setScore(finalScore);
    setShowResult(true);
  }, [answers, shuffledQuestions]);
  
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
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isAnswered = (q: Question) => {
    if (q.type === 'fill_in_the_blank') {
      return answers[q.id] && answers[q.id].trim() !== '';
    }
    return !!answers[q.id];
  };

  const allQuestionsAnswered = shuffledQuestions.every(q => isAnswered(q));

  const passed = score >= quiz.passingScore;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  const goToNext = () => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
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
                {quiz.timeLimit > 0 && ` You have ${quiz.timeLimit} minutes.`}
            </CardDescription>
          </CardHeader>
           <CardContent>
            {quiz.timeLimit > 0 && timeLeft !== null && (
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
                    <span>Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / shuffledQuestions.length) * 100} />
            </div>

            {currentQuestion && (
              <div>
                <p className="mb-4 font-semibold text-lg">
                  {currentQuestion.text}
                </p>
                {(currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') && (
                   <RadioGroup
                    value={answers[currentQuestion.id] || ''}
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
                )}
                 {currentQuestion.type === 'fill_in_the_blank' && (
                  <Input
                    placeholder="Type your answer here..."
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  />
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={goToPrevious} disabled={currentQuestionIndex === 0}>
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            
            {currentQuestionIndex === shuffledQuestions.length - 1 ? (
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
              {passed ? "Certification Granted!" : "More Study Needed"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You have completed the quiz. Here is your result.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 text-center flex flex-col items-center gap-4">
             {passed ? (
                <Award className="h-20 w-20 text-green-500" />
             ) : (
                <Frown className="h-20 w-20 text-red-500" />
             )}
            <div>
                <p className="text-sm text-muted-foreground">Your Score</p>
                <p className="text-6xl font-bold text-primary">{score}%</p>
                <p className="text-sm text-muted-foreground">Passing Score: {quiz.passingScore}%</p>
            </div>
            <p className="text-lg text-muted-foreground mt-2">
                {passed ? "Excellent work! You've successfully passed the assessment." : "Good effort! Please review the materials and try again."}
            </p>
          </div>
          <AlertDialogFooter className="sm:justify-center">
            {passed && (
                <Button asChild>
                    <Link href={`/courses/${quiz.courseId}/certificate`}>
                        <Award className="mr-2 h-4 w-4" />
                        View Certificate
                    </Link>
                </Button>
            )}
             <Button variant="outline" onClick={onComplete}>
                <BookCopy className="mr-2 h-4 w-4" />
                {passed ? 'Back to Course' : 'Review and Retry'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
