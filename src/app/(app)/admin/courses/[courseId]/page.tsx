
"use client";

import { useState, useMemo, useEffect, useContext } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { courses as initialCourses, quizzes, type Module, type Course } from '@/lib/data';
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
import { UserContext } from '../../layout';
import { AddModuleDialog } from '@/components/add-module-dialog';

const iconMap = {
  video: <Video className="h-5 w-5 text-accent" />,
  pdf: <FileText className="h-5 w-5 text-accent" />,
  slides: <Presentation className="h-5 w-5 text-accent" />,
};

const COURSES_STORAGE_KEY = "skillup-courses";

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = typeof params.courseId === 'string' ? params.courseId : '';
  const userRole = useContext(UserContext);
  const { toast } = useToast();
  
  const [course, setCourse] = useState<Course | undefined>();
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  const quiz = useMemo(() => quizzes.find((q) => q.courseId === courseId), [courseId]);

  const [showQuiz, setShowQuiz] = useState(false);

  useEffect(() => {
    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
    const coursesSource = storedCourses ? JSON.parse(storedCourses) : initialCourses;
    setAllCourses(coursesSource);
    setCourse(coursesSource.find((c: Course) => c.id === courseId));
  }, [courseId]);

  useEffect(() => {
    // Only save if allCourses has been loaded
    if(allCourses.length > 0) {
      const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
      if (JSON.stringify(allCourses) !== storedCourses) {
        localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(allCourses));
      }
    }
  }, [allCourses]);

  const progress = useMemo(() => {
    if (!course || course.modules.length === 0) return 0;
    const completedModules = course.modules.filter((m) => m.isCompleted).length;
    return Math.round((completedModules / course.modules.length) * 100);
  }, [course]);
  
  const allModulesCompleted = progress === 100;

  if (!course) {
    // Let useEffect handle finding the course, show loading or not found
    return <div>Loading course...</div>;
  }

  const handleModuleCompletion = (moduleId: string, completed: boolean) => {
    setCourse(prevCourse => {
      if (!prevCourse) return undefined;
      const newModules = prevCourse.modules.map(m => m.id === moduleId ? { ...m, isCompleted: completed } : m);
      const updatedCourse = { ...prevCourse, modules: newModules };
      
      setAllCourses(prevAllCourses => prevAllCourses.map(c => c.id === courseId ? updatedCourse : c));

      return updatedCourse;
    });
  };

  const handleModuleAdded = (newModule: Module) => {
    setCourse(prevCourse => {
      if (!prevCourse) return undefined;
      const updatedCourse = { ...prevCourse, modules: [...prevCourse.modules, newModule] };
      
      setAllCourses(prevAllCourses => prevAllCourses.map(c => c.id === courseId ? updatedCourse : c));

      return updatedCourse;
    });
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

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold font-headline">Course Modules</h2>
        {userRole === 'admin' && <AddModuleDialog onModuleAdded={handleModuleAdded} />}
      </div>

      {!showQuiz ? (
        <>
            <Accordion type="single" collapsible className="w-full" defaultValue={course.modules.length > 0 ? course.modules[0].id : undefined}>
                {course.modules.map((module) => (
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
            {course.modules.length === 0 && (
              <div className="text-center py-8 text-muted-foreground bg-muted/50 rounded-md">
                <p>No modules have been added to this course yet.</p>
                {userRole === 'admin' && <p>Click "Add Module" to get started.</p>}
              </div>
            )}

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
