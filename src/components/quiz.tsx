
"use client";

import { useState } from 'react';
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
import { Award, Frown, BookCopy } from 'lucide-react';
import type { Quiz as TQuiz, Question, Option as TOption } from '@prisma/client';

type QuizType = TQuiz & { questions: (Question & { options: TOption[] })[] };

type Answers = {
  [questionId: string]: string;
};

export function Quiz({ quiz, onComplete }: { quiz: QuizType, onComplete: () => void }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const isAnswered = (q: Question) => {
    if (q.type === 'fill_in_the_blank') {
      return answers[q.id] && answers[q.id].trim() !== '';
    }
    return !!answers[q.id];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let correctAnswers = 0;
    quiz.questions.forEach((q) => {
       if (q.type === 'fill_in_the_blank') {
        if (answers[q.id]?.trim().toLowerCase() === q.correctAnswerId.trim().toLowerCase()) {
          correctAnswers++;
        }
      } else {
        if (answers[q.id] === q.correctAnswerId) {
          correctAnswers++;
        }
      }
    });
    const finalScore = quiz.questions.length > 0 ? Math.round((correctAnswers / quiz.questions.length) * 100) : 0;
    setScore(finalScore);
    setShowResult(true);
  };

  const isSubmitDisabled = quiz.questions.some(q => !isAnswered(q));

  const passed = score >= quiz.passingScore;

  return (
    <>
      <Card className="mt-8 shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Knowledge Check</CardTitle>
            <CardDescription>Let's see what you've learned. Answer all questions to complete the course. The passing score is {quiz.passingScore}%.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {quiz.questions.map((q, index) => (
              <div key={q.id}>
                <p className="mb-4 font-semibold">
                  {index + 1}. {q.text}
                </p>
                {q.type === 'multiple_choice' && (
                   <RadioGroup
                    onValueChange={(value) => handleAnswerChange(q.id, value)}
                    className="space-y-2"
                  >
                    {q.options.map((opt) => (
                      <div key={opt.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt.id} id={`${q.id}-${opt.id}`} />
                        <Label htmlFor={`${q.id}-${opt.id}`} className="font-normal cursor-pointer">
                          {opt.text}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                 {q.type === 'true_false' && (
                  <RadioGroup
                    onValueChange={(value) => handleAnswerChange(q.id, value)}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`${q.id}-true`} />
                      <Label htmlFor={`${q.id}-true`} className="font-normal cursor-pointer">True</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`${q.id}-false`} />
                      <Label htmlFor={`${q.id}-false`} className="font-normal cursor-pointer">False</Label>
                    </div>
                  </RadioGroup>
                )}
                 {q.type === 'fill_in_the_blank' && (
                  <Input
                    placeholder="Type your answer here..."
                    onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitDisabled}>
              Submit Quiz
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <AlertDialog open={showResult} onOpenChange={setShowResult}>
        <AlertDialogContent>
          <AlertDialogHeader>
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
