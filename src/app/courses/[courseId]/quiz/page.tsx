
import React from 'react';
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Quiz } from '@/components/quiz';
import type { Quiz as TQuiz, Question, Option as TOption, Course, User } from '@prisma/client';

type QuizType = TQuiz & { questions: (Question & { options: TOption[] })[] };

type CourseWithQuiz = Course & {
    quiz: QuizType | null;
};

async function getQuizData(courseId: string, userId: string) {
    const course = await prisma.course.findUnique({
        where: { id: courseId },
        include: {
            quiz: {
                include: {
                    questions: {
                        orderBy: { createdAt: 'asc' }, // Ensure consistent question order
                        include: {
                            options: {
                                orderBy: { createdAt: 'asc' }, // Ensure consistent option order
                            },
                        },
                    },
                },
            },
        },
    });

    const user = await prisma.user.findUnique({ where: { id: userId } });

    return { course, user };
}


export default async function QuizPage({ params }: { params: { courseId: string } }) {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const { course, user } = await getQuizData(params.courseId, session.id);
    
    if (!course || !user || !course.quiz) {
        notFound();
    }
    
    // Shuffle questions on the server before passing to the client
    const shuffledQuestions = [...course.quiz.questions].sort(() => Math.random() - 0.5);
    const quizWithShuffled = {
        ...course.quiz,
        questions: shuffledQuestions,
    }

    const handleQuizComplete = async () => {
        'use server';
        redirect(`/courses/${params.courseId}`);
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Quiz 
                quiz={quizWithShuffled} 
                userId={user.id}
                onComplete={handleQuizComplete} 
            />
        </main>
    );
}
