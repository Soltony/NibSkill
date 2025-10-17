
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
import { Video, FileText, Presentation, Music, Bookmark, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ModuleContent } from '@/components/module-content';
import { Skeleton } from '@/components/ui/skeleton';
import type { Course, Module, Product, Quiz as TQuiz, Question, Option as TOption, UserCompletedModule, User } from '@prisma/client';
import { FeatureNotImplementedDialog } from '@/components/feature-not-implemented-dialog';
import { toggleModuleCompletion } from '@/app/actions/user-actions';
import { UserContext } from '@/app/layout';
import { AddModuleDialog } from '@/components/add-module-dialog';
import { EditModuleDialog } from '@/components/edit-module-dialog';


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
    user: User;
}

type CourseDetailClientProps = {
    courseData: CourseData;
}

export function CourseDetailClient({ courseData: initialCourseData }: CourseDetailClientProps) {
  const { toast } = useToast();
  const userRole = useContext(UserContext);
  
  const [courseData, setCourseData] = useState<CourseData>(initialCourseData);
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

  const quiz = course.quiz as QuizType | undefined;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative mb-8 h-64 w-full overflow-hidden rounded-lg shadow-lg">
        {course.imageUrl ? (
            <Image
              src={course.imageUrl}
              alt={course.imageDescription ?? ''}
              fill
              className="object-cover"
              data-ai-hint={course.imageHint ?? ''}
            />
        ) : (
            <Skeleton className="h-full w-full" />
        )}
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
                        <ModuleContent module={module as any} />
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`complete-${module.id}`}
                                        checked={localCompletedModules.has(module.id)}
                                        onCheckedChange={(checked) => handleModuleCompletion(module.id, !!checked)}
                                    />
                                    <Label htmlFor={`complete-${module.id}`} className="cursor-pointer">Mark as completed</Label>
                                </div>
                                <FeatureNotImplementedDialog
                                    title="Bookmark Module"
                                    description="This feature is not yet implemented. In the future, you will be able to bookmark modules to easily find them later."
                                    triggerVariant="ghost"
                                    triggerSize="sm"
                                    triggerText="Bookmark"
                                    triggerIcon={<Bookmark className="mr-2 h-4 w-4" />}
                                />
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
                    <Button size="lg" asChild disabled={!allModulesCompleted}>
                      <Link href={`/courses/${course.id}/quiz`}>Take Quiz</Link>
                    </Button>
                ) : (
                    <p className="text-muted-foreground">Quiz not available for this course.</p>
                )}
                {!allModulesCompleted && quiz && <p className="text-sm mt-2 text-muted-foreground">Complete all modules to unlock the quiz.</p>}
            </div>
        </>
    </div>
  );
}
