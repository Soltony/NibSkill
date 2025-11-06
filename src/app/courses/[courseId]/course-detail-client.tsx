

"use client";

import { useState, useMemo, useEffect, useCallback, useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Video, FileText, Presentation, Music, Bookmark, Pencil, ShoppingCart, Loader2, Award, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ModuleContent } from '@/components/module-content';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course, Module, Product, Quiz as TQuiz, Question, Option as TOption, UserCompletedModule, User, Currency, UserCompletedCourse } from '@prisma/client';
import { FeatureNotImplementedDialog } from '@/components/feature-not-implemented-dialog';
import { toggleModuleCompletion } from '@/app/actions/user-actions';
import { UserContext } from '@/app/layout';
import { AddModuleDialog } from '@/components/add-module-dialog';
import { EditModuleDialog } from '@/components/edit-module-dialog';
import { Badge } from '@/components/ui/badge';


const iconMap = {
  video: <Video className="h-5 w-5 text-accent" />,
  pdf: <FileText className="h-5 w-5 text-accent" />,
  slides: <Presentation className="h-5 w-5 text-accent" />,
  audio: <Music className="h-5 w-5 text-accent" />,
};

type QuizType = TQuiz & { questions: (Question & { options: TOption[] })[] };

type CourseWithRelations = Course & {
    modules: Module[];
    product: Product | null;
    quiz: QuizType | null;
};

type CourseData = {
    course: CourseWithRelations;
    completedModules: { moduleId: string }[];
    user: User & { role?: any };
    previousAttempts: UserCompletedCourse[];
}

type CourseDetailClientProps = {
    courseData: CourseData;
}

declare global {
  interface Window {
    myJsChannel?: {
      postMessage: (message: { token: string }) => void;
    };
  }
}


export function CourseDetailClient({ courseData: initialCourseData }: CourseDetailClientProps) {
  const { toast } = useToast();
  const userRole = useContext(UserContext);
  
  const [courseData, setCourseData] = useState<CourseData>(initialCourseData);
  const [isPaying, setIsPaying] = useState(false);
  const [localCompletedModules, setLocalCompletedModules] = useState<Set<string>>(
      new Set(initialCourseData.completedModules.map(cm => cm.moduleId))
  );

  const course = courseData.course;
  
  const progress = useMemo(() => {
    if (!courseData || courseData.course.modules.length === 0) return 0;
    return Math.round((localCompletedModules.size / courseData.course.modules.length) * 100);
  }, [courseData, localCompletedModules]);
  
  const allModulesCompleted = progress === 100;
  
  const handleModuleAdded = (newModule: Module) => {
    setCourseData(prev => {
      if (!prev) return initialCourseData;
      return { ...prev, course: { ...prev.course, modules: [...prev.course.modules, newModule] } };
    });
  };
  
  const handleModuleUpdated = (updatedModule: Module) => {
     setCourseData(prev => {
      if (!prev) return initialCourseData;
      const newModules = prev.course.modules.map(m => m.id === updatedModule.id ? updatedModule : m);
      return { ...prev, course: { ...prev.course, modules: newModules } };
    });
  };

  if (!course) {
    return (
        <div className="mx-auto max-w-4xl space-y-8">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
  }
  
  const handleModuleCompletion = async (moduleId: string, completed: boolean) => {
    // Prevent re-toggling if already in the desired state
    if (completed === localCompletedModules.has(moduleId)) return;
    
    // Optimistic UI update
    const newCompletions = new Set(localCompletedModules);
    if (completed) {
        newCompletions.add(moduleId);
    } else {
        newCompletions.delete(moduleId);
    }
    setLocalCompletedModules(newCompletions);

    const result = await toggleModuleCompletion(course.id, { moduleId, completed });
    
    if (!result.success) {
      toast({
        title: "Error updating progress",
        description: result.message,
        variant: "destructive"
      });
      // Revert optimistic update
      setLocalCompletedModules(new Set(courseData?.completedModules.map(cm => cm.moduleId)))
    }
  };

  const handleBuyCourse = async () => {
    console.log('[Client] "Buy Course" button clicked.');
    setIsPaying(true);
    try {
        console.log('[Client] Initiating payment API call.');
        // The JWT from the session is automatically sent in the cookies by the browser
        const paymentResponse = await fetch('/api/payment/initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: course.price })
        });
        
        console.log('[Client] /api/payment/initiate response status:', paymentResponse.status);
        const paymentData = await paymentResponse.json();
        console.log('[Client] /api/payment/initiate response data:', paymentData);

        if (!paymentResponse.ok || !paymentData.success) {
            throw new Error(paymentData.message || "Failed to initiate payment.");
        }

        const paymentToken = paymentData.paymentToken;
        console.log('[Client] Received payment token:', paymentToken);

        if (typeof window !== 'undefined' && window.myJsChannel?.postMessage) {
            console.log('[Client] Found window.myJsChannel. Posting message...');
            window.myJsChannel.postMessage({ token: paymentToken });
            toast({
                title: "Payment Initiated",
                description: "Please complete the payment in the NIBtera Super App.",
            });
        } else {
            console.error("[Client] NIB Super App channel (window.myJsChannel) not found.");
            toast({
                title: "Error",
                description: "Could not communicate with the payment app. This feature is only available within the NIBtera app.",
                variant: "destructive",
            });
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : "An unknown error occurred.";
        console.error('[Client] Payment Failed:', message);
        toast({
            title: "Payment Failed",
            description: message,
            variant: "destructive"
        });
    } finally {
        setIsPaying(false);
    }
  }


  const quiz = course.quiz as QuizType | undefined;
  
  const displayImageUrl = course.imageUrl ?? course.product?.imageUrl;
  const displayImageHint = course.imageHint ?? course.product?.imageHint;
  const displayImageDescription = course.imageDescription ?? course.product?.description;
  
  const getCurrencySymbol = (currency: Currency | null | undefined) => {
    if (currency === 'USD') return '$';
    if (currency === 'ETB') return 'Br';
    return '';
  }

  const { hasPassed, attemptsUsed, maxAttempts, canAttempt } = useMemo(() => {
    if (!quiz) return { hasPassed: false, attemptsUsed: 0, maxAttempts: 0, canAttempt: true };
    
    const attempts = courseData.previousAttempts || [];
    const hasPassed = attempts.some(attempt => attempt.score >= quiz.passingScore);
    const attemptsUsed = attempts.length;
    const maxAttempts = quiz.maxAttempts;
    const canAttempt = maxAttempts === 0 || attemptsUsed < maxAttempts;
    
    return { hasPassed, attemptsUsed, maxAttempts, canAttempt };
  }, [quiz, courseData.previousAttempts]);

  const renderQuizButton = () => {
    if (course.isPaid) return null;
    if (!quiz) return <p className="text-muted-foreground">Quiz not available for this course.</p>;
    if (!allModulesCompleted) return <p className="text-sm mt-2 text-muted-foreground">Complete all modules to unlock the quiz.</p>;

    if (quiz.quizType === 'CLOSED_LOOP' && hasPassed) {
        return (
             <Button size="lg" disabled>
                <ShieldCheck className="mr-2 h-5 w-5" />
                Quiz Passed
            </Button>
        );
    }
    
    if (quiz.quizType === 'CLOSED_LOOP' && !canAttempt) {
        return (
             <Button size="lg" disabled>
                <ShieldCheck className="mr-2 h-5 w-5" />
                No Attempts Left
            </Button>
        );
    }

    return (
        <Button size="lg" asChild>
            <Link href={`/courses/${course.id}/quiz`}>Take Quiz</Link>
        </Button>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative mb-8 h-64 w-full overflow-hidden rounded-lg shadow-lg">
        {displayImageUrl ? (
            <Image
              src={displayImageUrl}
              alt={displayImageDescription ?? ''}
              fill
              className="object-cover"
              data-ai-hint={displayImageHint ?? ''}
            />
        ) : (
            <Skeleton className="h-full w-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 p-6 w-full flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-white font-headline">{course.title}</h1>
            <p className="text-lg text-white/90 max-w-2xl">{course.description}</p>
          </div>
          {course.isPaid && course.price && course.currency && (
            <Badge variant="secondary" className="text-lg">
              {getCurrencySymbol(course.currency)}{course.price.toFixed(2)}
            </Badge>
          )}
        </div>
      </div>
      
      { !course.isPaid && (
        <div className="mb-6 space-y-2">
            <div className="flex justify-between text-sm font-medium text-muted-foreground">
                <span>Overall Progress</span>
                <span>{progress}%</span>
            </div>
            <Progress value={progress} />
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold font-headline">Course Modules</h2>
        {userRole === 'admin' && <AddModuleDialog onModuleAdded={handleModuleAdded} courseId={course.id} />}
      </div>
        {course.isPaid ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-md">
                <p>This is a paid course. Purchase to access modules and quizzes.</p>
            </div>
        ) : (
        <>
            <Accordion type="single" collapsible className="w-full" defaultValue={course.modules.length > 0 ? course.modules[0].id : undefined}>
                {course.modules.map((module) => {
                  const isUploadedMedia = (module.type === 'VIDEO' || module.type === 'AUDIO') && module.content.startsWith('data:');

                  return (
                    <AccordionItem value={module.id} key={module.id}>
                        <AccordionTrigger className="font-semibold hover:no-underline">
                            <div className="flex items-center gap-4">
                                {iconMap[module.type.toLowerCase() as keyof typeof iconMap]}
                                <span>{module.title}</span>
                                <span className="text-sm font-normal text-muted-foreground">({module.duration} min)</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                            <ModuleContent module={module as any} onAutoComplete={() => handleModuleCompletion(module.id, true)} />
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="flex items-center gap-4">
                                    <FeatureNotImplementedDialog
                                        title="Bookmark Module"
                                        description="This feature is not yet implemented. In the future, you will be able to bookmark modules to easily find them later."
                                    >
                                        <Button variant="ghost" size="sm">
                                            <Bookmark className="mr-2 h-4 w-4" />
                                            Bookmark
                                        </Button>
                                    </FeatureNotImplementedDialog>
                                </div>
                                {userRole === 'admin' && (
                                    <EditModuleDialog module={module as any} onModuleUpdated={handleModuleUpdated}>
                                        <Button variant="ghost" size="sm">
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit Module
                                        </Button>
                                    </EditModuleDialog>
                                )}
                            </div>
                        </div>
                        </AccordionContent>
                    </AccordionItem>
                  )
                })}
            </Accordion>
            {course.modules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-md">
                <p>No modules have been added to this course yet.</p>
                {userRole === 'admin' && <p>Click "Add Module" to get started.</p>}
              </div>
            )}
            </>
        )}

            <div className="mt-8 text-center">
                {course.isPaid ? (
                    <Button size="lg" onClick={handleBuyCourse} disabled={isPaying}>
                        {isPaying ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                        {isPaying ? 'Processing...' : 'Buy the course'}
                    </Button>
                ) : (
                    renderQuizButton()
                )}
            </div>
    </div>
  );
}
