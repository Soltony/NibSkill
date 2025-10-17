
"use client";

import { useState, useMemo, useContext } from 'react';
import Image from 'next/image';
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
import { Video, FileText, Presentation, Pencil, Bookmark, Music } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserContext } from '@/app/layout';
import { AddModuleDialog } from '@/components/add-module-dialog';
import { EditModuleDialog } from '@/components/edit-module-dialog';
import { ModuleContent } from '@/components/module-content';
import type { Course, Module as TModule, Product, Quiz as TQuiz, Question, Option } from '@prisma/client';
import { Skeleton } from '@/components/ui/skeleton';
import { FeatureNotImplementedDialog } from '@/components/feature-not-implemented-dialog';
import Link from 'next/link';

const iconMap = {
  video: <Video className="h-5 w-5 text-accent" />,
  pdf: <FileText className="h-5 w-5 text-accent" />,
  slides: <Presentation className="h-5 w-5 text-accent" />,
  audio: <Music className="h-5 w-5 text-accent" />,
};

type QuizType = TQuiz & { questions: (Question & { options: Option[] })[] };

type CourseWithRelations = Course & { 
    modules: TModule[],
    product: Product | null,
    quiz: QuizType | null
};

type CourseDetailAdminClientProps = {
    course: CourseWithRelations;
    initialProgress: number;
}

export function CourseDetailAdminClient({ course: initialCourse, initialProgress }: CourseDetailAdminClientProps) {
  const userRole = useContext(UserContext);
  const { toast } = useToast();
  
  const [course, setCourse] = useState<CourseWithRelations>(initialCourse);
  const [progress, setProgress] = useState(initialProgress);
  
  const quiz = course.quiz;

  if (!course) {
    return <div>Loading course...</div>;
  }

  const handleModuleAdded = (newModule: TModule) => {
    setCourse(prevCourse => {
      if (!prevCourse) return initialCourse;
      return { ...prevCourse, modules: [...prevCourse.modules, newModule] };
    });
  };
  
  const handleModuleUpdated = (updatedModule: TModule) => {
    setCourse(prevCourse => {
      if (!prevCourse) return initialCourse;
      const newModules = prevCourse.modules.map(m => m.id === updatedModule.id ? updatedModule : m);
      return { ...prevCourse, modules: newModules };
    });
  };

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
            <span>Overall User Progress (mock)</span>
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
                            <FeatureNotImplementedDialog
                                title="Bookmark Module"
                                description="This feature is for users. Admins manage content here."
                                triggerVariant="ghost"
                                triggerSize="sm"
                                triggerText="Bookmark"
                                triggerIcon={<Bookmark className="mr-2 h-4 w-4" />}
                            />
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
                    <Button size="lg" asChild>
                       <Link href={`/admin/quizzes?quizId=${quiz.id}`}>
                        Manage Quiz
                       </Link>
                    </Button>
                ) : (
                    <p className="text-muted-foreground">Quiz not available for this course.</p>
                )}
            </div>
        </>
    </div>
  );
}

