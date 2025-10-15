
"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Quiz } from '@/components/quiz';
import { useToast } from '@/hooks/use-toast';
import type { Quiz as TQuiz, Question, Option as TOption, Course } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';

type QuizType = TQuiz & { questions: (Question & { options: TOption[] })[] };

type CourseWithQuiz = Course & {
    quiz: QuizType | null;
};

export default function QuizPage() {
    const params = useParams();
    const router = useRouter();
    const courseId = typeof params.courseId === 'string' ? params.courseId : '';
    const { toast } = useToast();
    const [course, setCourse] = useState<CourseWithQuiz | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchCourseAndQuiz() {
            if (courseId) {
                try {
                    setIsLoading(true);
                    const res = await fetch(`/api/courses/${courseId}?quiz=true`);
                    if (res.ok) {
                        const data = await res.json();
                        if (!data.quiz) {
                            toast({ title: "No Quiz", description: "This course does not have a quiz.", variant: "destructive" });
                            router.replace(`/courses/${courseId}`);
                            return;
                        }
                        setCourse(data);
                    } else {
                        toast({ title: "Error", description: "Failed to fetch quiz details.", variant: "destructive" });
                        router.replace(`/courses/${courseId}`);
                    }
                } catch (error) {
                    toast({ title: "Error", description: "Could not connect to the server.", variant: "destructive" });
                    router.replace(`/courses/${courseId}`);
                } finally {
                    setIsLoading(false);
                }
            }
        }
        fetchCourseAndQuiz();
    }, [courseId, toast, router]);

    const handleQuizComplete = () => {
        // For now, just navigate back to the course page.
        // A more advanced implementation might show a results summary first.
        router.push(`/courses/${courseId}`);
    };
    
    if (isLoading || !course?.quiz) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-full max-w-3xl space-y-8 p-4">
                    <Skeleton className="h-12 w-1/2" />
                    <Skeleton className="h-8 w-3/4" />
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
            <Quiz quiz={course.quiz} onComplete={handleQuizComplete} />
        </main>
    );
}
