
"use client";

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { courses as initialCourses, quizzes as initialQuizzes, type Module, type Course, type Quiz as QuizType } from '@/lib/data';
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
import { ModuleContent } from '@/components/module-content';
import { Skeleton } from '@/components/ui/skeleton';

const iconMap = {
  video: <Video className="h-5 w-5 text-accent" />,
  pdf: <FileText className="h-5 w-5 text-accent" />,
  slides: <Presentation className="h-5 w-5 text-accent" />,
};

const COURSES_STORAGE_KEY = "skillup-courses";
const QUIZZES_STORAGE_KEY = "skillup-quizzes";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = typeof params.courseId === 'string' ? params.courseId : '';
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<QuizType[]>([]);

  const quiz = useMemo(() => allQuizzes.find((q) => q.courseId === courseId), [courseId, allQuizzes]);

  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
    const coursesSource = storedCourses ? JSON.parse(storedCourses) : initialCourses;
    setAllCourses(coursesSource);
    const currentCourse = coursesSource.find((c: Course) => c.id === courseId);
    setCourse(currentCourse ?? null);

    const storedQuizzes = localStorage.getItem(QUIZZES_STORAGE_KEY);
    setAllQuizzes(storedQuizzes ? JSON.parse(storedQuizzes) : initialQuizzes);
  }, [courseId]);

  useEffect(() => {
    if (allCourses.length > 0) {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(allCourses));
    }
  }, [allCourses]);

  const progress = useMemo(() => {
    if (!course || course.modules.length === 0) return 0;
    // const completedModules = course.modules.filter((m) => m.isCompleted).length;
    // return Math.round((completedModules / course.modules.length) * 100);
    // Mock progress for demo
    const completedModules = course.modules.filter((m, i) => i < course.title.length % course.modules.length).length;
    return Math.round((completedModules / course.modules.length) * 100);
  }, [course]);
  
  const allModulesCompleted = progress === 100;

  if (!course) {
    return <div>Loading course...</div>;
  }

  const handleModuleCompletion = (moduleId: string, completed: boolean) => {
     toast({
        title: "Action Not Implemented",
        description: "User-specific progress tracking is not implemented in this prototype."
    })
    // setCourse(prevCourse => {
    //   if (!prevCourse) return undefined;
    //   const newModules = prevCourse.modules.map(m => m.id === moduleId ? { ...m, isCompleted: completed } : m);
    //   const updatedCourse = { ...prevCourse, modules: newModules };
      
    //   setAllCourses(prevAllCourses => prevAllCourses.map(c => c.id === courseId ? updatedCourse : c));

    //   return updatedCourse;
    // });
  };

  const handleStartQuiz = () => {
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
        {course.image ? (
            <Image
            src={course.image.imageUrl}
            alt={course.image.description}
            fill
            className="object-cover"
            data-ai-hint={course.image.imageHint}
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
                        <ModuleContent module={module} />
                        <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`complete-${module.id}`}
                                    // checked={module.isCompleted}
                                    onCheckedChange={(checked) => handleModuleCompletion(module.id, !!checked)}
                                />
                                <Label htmlFor={`complete-${module.id}`} className="cursor-pointer">Mark as completed</Label>
                            </div>
                        </div>
                    </div>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
            {course.modules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-md">
                <p>No modules have been added to this course yet.</p>
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
