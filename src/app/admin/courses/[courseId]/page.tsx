
"use client";

import { useState, useMemo, useEffect, useContext } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import type { Module, Quiz as QuizType } from '@/lib/data';
import { quizzes as initialQuizzes } from '@/lib/data';
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
import { Quiz } from '@/components/quiz';
import { Video, FileText, Presentation, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserContext } from '@/app/layout';
import { AddModuleDialog } from '@/components/add-module-dialog';
import { EditModuleDialog } from '@/components/edit-module-dialog';
import { ModuleContent } from '@/components/module-content';
import type { Course, Module as TModule, Product } from '@prisma/client';

const iconMap = {
  video: <Video className="h-5 w-5 text-accent" />,
  pdf: <FileText className="h-5 w-5 text-accent" />,
  slides: <Presentation className="h-5 w-5 text-accent" />,
};

type CourseWithModulesAndProduct = Course & { 
    modules: TModule[],
    product: Product | null
};


export default function CourseDetailPage() {
  const params = useParams();
  const courseId = typeof params.courseId === 'string' ? params.courseId : '';
  const userRole = useContext(UserContext);
  const { toast } = useToast();
  
  const [course, setCourse] = useState<CourseWithModulesAndProduct | null>(null);
  const [allQuizzes, setAllQuizzes] = useState<QuizType[]>([]);

  const quiz = useMemo(() => allQuizzes.find((q) => q.courseId === courseId), [courseId, allQuizzes]);

  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    async function fetchCourse() {
        if (courseId) {
            // This is a mock fetch. In a real app, you'd fetch from your API.
            // Using a server action or API route would be more robust.
            // For now, we simulate by getting data from a server-side function
            // but this won't work in a real client component.
            // This is a placeholder for actual data fetching logic.
             try {
                const res = await fetch(`/api/courses/${courseId}`);
                if (res.ok) {
                    const data = await res.json();
                    setCourse(data);
                } else {
                    toast({ title: "Error", description: "Failed to fetch course details.", variant: "destructive"});
                }
            } catch (error) {
                toast({ title: "Error", description: "Could not connect to the server.", variant: "destructive"});
            }
        }
    }
    // fetchCourse();
    
    // In a real app, quizzes would be fetched from the DB
    const storedQuizzes = localStorage.getItem("skillup-quizzes");
    setAllQuizzes(storedQuizzes ? JSON.parse(storedQuizzes) : initialQuizzes);
  }, [courseId, toast]);


  const progress = useMemo(() => {
    if (!course || course.modules.length === 0) return 0;
    // In a real app, completion would be per-user.
    // We'll mock it based on index for demonstration.
    const completedModules = course.modules.filter((m, i) => i < course.title.length % course.modules.length).length;
    return Math.round((completedModules / course.modules.length) * 100);
  }, [course]);
  
  const allModulesCompleted = progress === 100;

  if (!course) {
    return <div>Loading course...</div>;
  }

  const handleModuleCompletion = (moduleId: string, completed: boolean) => {
    // This is a mock implementation for client-side state update.
    // In a real app, this would be a server action to update user progress.
    toast({
        title: "Action Not Implemented",
        description: "User-specific progress tracking is not implemented in this prototype."
    })
  };

  const handleModuleAdded = (newModule: TModule) => {
    setCourse(prevCourse => {
      if (!prevCourse) return null;
      return { ...prevCourse, modules: [...prevCourse.modules, newModule] };
    });
  };
  
  const handleModuleUpdated = (updatedModule: TModule) => {
    setCourse(prevCourse => {
      if (!prevCourse) return null;
      const newModules = prevCourse.modules.map(m => m.id === updatedModule.id ? updatedModule : m);
      return { ...prevCourse, modules: newModules };
    });
  };


  const handleStartQuiz = () => {
    // Forcing quiz start for demo purposes, as completion is mocked.
    setShowQuiz(true);
    // if (allModulesCompleted) {
    //   setShowQuiz(true);
    // } else {
    //   toast({
    //     title: "Complete all modules",
    //     description: "Please complete all modules before starting the quiz.",
    //     variant: "destructive",
    //   });
    // }
  };
  
  const handleQuizComplete = () => {
    toast({
        title: "Course Completed!",
        description: `Congratulations on completing the "${course.title}" course.`,
    });
    setShowQuiz(false);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative mb-8 h-64 w-full overflow-hidden rounded-lg shadow-lg">
        <Image
          src={course.imageUrl || ''}
          alt={course.imageDescription || ''}
          fill
          className="object-cover"
          data-ai-hint={course.imageHint || ''}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 p-6">
            <h1 className="text-4xl font-bold text-white font-headline">{course.title}</h1>
            <p className="text-lg text-white/90 max-w-2xl">{course.description}</p>
        </div>
      </div>
      
      <div className="mb-6 space-y-2">
        <div className="flex justify-between text-sm font-medium text-muted-foreground">
            <span>Overall Progress</span>
            <span>{progress}%</span>
        </div>
        <Progress value={progress} />
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold font-headline">Course Modules</h2>
        {userRole === 'admin' && <AddModuleDialog onModuleAdded={handleModuleAdded} courseId={course.id} />}
      </div>

      {!showQuiz ? (
        <>
            <Accordion type="single" collapsible className="w-full" defaultValue={course.modules.length > 0 ? course.modules[0].id : undefined}>
                {course.modules.map((module) => (
                <AccordionItem value={module.id} key={module.id}>
                    <AccordionTrigger className="font-semibold hover:no-underline">
                        <div className="flex items-center gap-4">
                            {iconMap[module.type as keyof typeof iconMap]}
                            <span>{module.title}</span>
                            <span className="text-sm font-normal text-muted-foreground">({module.duration} min)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                    <div className="space-y-4 p-4 bg-muted/50 rounded-md">
                        <ModuleContent module={module as Module} />
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`complete-${module.id}`}
                                    // checked={module.isCompleted} // This would come from user progress model
                                    onCheckedChange={(checked) => handleModuleCompletion(module.id, !!checked)}
                                />
                                <Label htmlFor={`complete-${module.id}`} className="cursor-pointer">Mark as completed</Label>
                            </div>
                            {userRole === 'admin' && (
                                <EditModuleDialog module={module as Module} onModuleUpdated={handleModuleUpdated}>
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
                ))}
            </Accordion>
            {course.modules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-md">
                <p>No modules have been added to this course yet.</p>
                {userRole === 'admin' && <p>Click "Add Module" to get started.</p>}
              </div>
            )}

            <div className="mt-8 text-center">
                {quiz ? (
                    <Button size="lg" onClick={handleStartQuiz}>
                        Take Quiz
                    </Button>
                ) : (
                    <p className="text-muted-foreground">Quiz not available for this course.</p>
                )}
                {!allModulesCompleted && quiz && <p className="text-sm mt-2 text-muted-foreground">Complete all modules to unlock the quiz (feature disabled for demo).</p>}
            </div>
        </>
      ) : quiz ? (
        <Quiz quiz={quiz} onComplete={handleQuizComplete} />
      ) : (
        <p>Quiz not available for this course.</p>
      )}

    </div>
  );
}
