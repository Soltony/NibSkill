
"use client";

import { useState } from 'react';
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
import type { Quiz as QuizType, Question } from '@/lib/data';
import { Input } from './ui/input';

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
    if (q.type === 'fill-in-the-blank') {
      return answers[q.id] && answers[q.id].trim() !== '';
    }
    return !!answers[q.id];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let correctAnswers = 0;
    quiz.questions.forEach((q) => {
       if (q.type === 'fill-in-the-blank') {
        if (answers[q.id]?.trim().toLowerCase() === q.correctAnswerId.trim().toLowerCase()) {
          correctAnswers++;
        }
      } else {
        if (answers[q.id] === q.correctAnswerId) {
          correctAnswers++;
        }
      }
    });
    const finalScore = Math.round((correctAnswers / quiz.questions.length) * 100);
    setScore(finalScore);
    setShowResult(true);
  };

  const isSubmitDisabled = quiz.questions.some(q => !isAnswered(q));

  return (
    <>
      <Card className="mt-8 shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Knowledge Check</CardTitle>
            <CardDescription>Let's see what you've learned. Answer all questions to complete the course.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {quiz.questions.map((q, index) => (
              <div key={q.id}>
                <p className="mb-4 font-semibold">
                  {index + 1}. {q.text}
                </p>
                {q.type === 'multiple-choice' && (
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
                 {q.type === 'true-false' && (
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
                 {q.type === 'fill-in-the-blank' && (
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
            <AlertDialogTitle className="font-headline">Quiz Result</AlertDialogTitle>
            <AlertDialogDescription>
              You have completed the quiz. Here is your score.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 text-center">
            <p className="text-6xl font-bold text-primary">{score}%</p>
            <p className="text-lg text-muted-foreground">
                {score >= 80 ? "Excellent work!" : "Good effort! Review the materials for a better score."}
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={onComplete}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
