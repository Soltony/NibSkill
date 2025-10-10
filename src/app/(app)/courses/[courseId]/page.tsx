"use client";

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { courses, quizzes, type Module } from '@/lib/data';
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
import { Video, FileText, Presentation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const iconMap = {
  video: <Video className="h-5 w-5 text-accent" />,
  pdf: <FileText className="h-5 w-5 text-accent" />,
  slides: <Presentation className="h-5 w-5 text-accent" />,
};

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const { toast } = useToast();
  const course = courses.find((c) => c.id === params.courseId);
  const quiz = quizzes.find((q) => q.courseId === params.courseId);

  const [modules, setModules] = useState<Module[]>([]);
  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    if (course) {
      setModules(course.modules);
    }
  }, [course]);

  const progress = useMemo(() => {
    if (modules.length === 0) return 0;
    const completedModules = modules.filter((m) => m.isCompleted).length;
    return Math.round((completedModules / modules.length) * 100);
  }, [modules]);
  
  const allModulesCompleted = progress === 100;

  if (!course) {
    notFound();
  }

  const handleModuleCompletion = (moduleId: string, completed: boolean) => {
    setModules((prevModules) =>
      prevModules.map((m) => (m.id === moduleId ? { ...m, isCompleted: completed } : m))
    );
  };

  const handleStartQuiz = () => {
    if (allModulesCompleted) {
      setShowQuiz(true);
    } else {
      toast({
        title: "Complete all modules",
        description: "Please complete all modules before starting the quiz.",
        variant: "destructive",
      });
    }
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
          src={course.image.imageUrl}
          alt={course.image.description}
          fill
          className="object-cover"
          data-ai-hint={course.image.imageHint}
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

      {!showQuiz ? (
        <>
            <Accordion type="single" collapsible className="w-full" defaultValue={modules.length > 0 ? modules[0].id : undefined}>
                {modules.map((module) => (
                <AccordionItem value={module.id} key={module.id}>
                    <AccordionTrigger className="font-semibold hover:no-underline">
                        <div className="flex items-center gap-4">
                            {iconMap[module.type]}
                            <span>{module.title}</span>
                            <span className="text-sm font-normal text-muted-foreground">({module.duration} min)</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-md">
                        <p>Placeholder for module content. This could be an embedded video, a PDF viewer, or slides.</p>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id={`complete-${module.id}`}
                                checked={module.isCompleted}
                                onCheckedChange={(checked) => handleModuleCompletion(module.id, !!checked)}
                            />
                            <Label htmlFor={`complete-${module.id}`} className="cursor-pointer">Mark as completed</Label>
                        </div>
                    </div>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>

            <div className="mt-8 text-center">
                <Button size="lg" onClick={handleStartQuiz} disabled={!allModulesCompleted}>
                    Take Quiz
                </Button>
                {!allModulesCompleted && <p className="text-sm mt-2 text-muted-foreground">Complete all modules to unlock the quiz.</p>}
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
