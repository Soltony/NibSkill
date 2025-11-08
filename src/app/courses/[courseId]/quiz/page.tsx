
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Quiz } from '@/components/quiz';
import type { Quiz as TQuiz, Question, Option as TOption, Course, User, UserCompletedCourse } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BookCopy, ShieldExclamation } from 'lucide-react';

type QuizType = TQuiz & { 
  questions: (Question & { options: TOption[] })[],
  course: Course 
};

async function getQuizData(courseId: string, userId: string) {
    const quiz = await prisma.quiz.findFirst({
        where: { courseId: courseId },
        include: {
            course: true,
            questions: {
                orderBy: { createdAt: 'asc' }, // Ensure consistent question order
                include: {
                    options: {
                        orderBy: { createdAt: 'asc' }, // Ensure consistent option order
                    },
                },
            },
        },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const previousAttempts = await prisma.userCompletedCourse.findMany({
        where: {
            userId: userId,
            courseId: courseId
        },
        orderBy: { completionDate: 'desc' }
    });

    return { quiz, user, previousAttempts };
}


export default async function QuizPage({ params }: { params: { courseId: string } }) {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }
    
    const { courseId } = params;

    const { quiz, user, previousAttempts } = await getQuizData(courseId, session.id);
    
    if (!quiz || !user) {
        notFound();
    }

    const handleQuizComplete = async () => {
        'use server';
        redirect(`/courses/${courseId}`);
    };

    const hasPassed = previousAttempts.some(attempt => attempt.score >= quiz.passingScore);
    const attemptsUsed = previousAttempts.length;
    const maxAttempts = quiz.maxAttempts ?? 0;
    const canAttempt = maxAttempts === 0 || attemptsUsed < maxAttempts;

    if (quiz.quizType === 'CLOSED_LOOP' && hasPassed) {
        return (
             <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <CardTitle>Quiz Already Passed</CardTitle>
                        <CardDescription>Congratulations, you have already passed this quiz!</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button asChild>
                            <Link href={`/courses/${courseId}`}>Back to Course</Link>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        )
    }

    if (quiz.quizType === 'CLOSED_LOOP' && !canAttempt) {
        return (
            <main className="flex min-h-screen flex-col items-center justify-center p-4">
                <Card className="w-full max-w-lg text-center">
                    <CardHeader>
                        <ShieldExclamation className="h-12 w-12 mx-auto text-destructive" />
                        <CardTitle className="mt-4">Quiz Locked</CardTitle>
                        <CardDescription>You have used all your attempts for this quiz.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-muted-foreground">Please review the course materials thoroughly. You may need to contact an administrator for another attempt.</p>
                         <Button asChild variant="outline">
                            <Link href={`/courses/${courseId}`}>
                                <BookCopy className="mr-2 h-4 w-4" />
                                Review Course Materials
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        )
    }
    
    const shuffledQuestions = [...quiz.questions].sort(() => Math.random() - 0.5);
    const quizWithShuffled = {
        ...quiz,
        questions: shuffledQuestions,
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Quiz 
                quiz={quizWithShuffled as QuizType} 
                userId={user.id}
                onComplete={handleQuizComplete} 
            />
        </main>
    );
}
