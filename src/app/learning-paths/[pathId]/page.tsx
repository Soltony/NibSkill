
import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Progress } from "@/components/ui/progress"
import { CourseCard } from "@/components/course-card"
import { MoveLeft, CheckCircle, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default async function LearningPathDetailPage({ params }: { params: Promise<{ pathId: string }> }) {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }

  const { pathId } = await params;
  
  const learningPath = await prisma.learningPath.findUnique({
    where: { id: pathId },
    include: { 
      courses: { 
        orderBy: { order: 'asc' },
        include: { course: { include: { modules: true, product: true } } } 
      } 
    },
  })

  if (!learningPath) {
    notFound();
  }
  
  const courseIds = learningPath.courses.map(c => c.course.id);

  // Fetch both module completions and full course completions
  const userModuleCompletions = await prisma.userCompletedModule.findMany({
    where: { 
      userId: user.id,
      moduleId: {
        in: learningPath.courses.flatMap(c => c.course.modules.map(m => m.id))
      }
    },
    select: { moduleId: true }
  });
  
  const userCourseCompletions = await prisma.userCompletedCourse.findMany({
      where: {
          userId: user.id,
          courseId: { in: courseIds }
      },
      select: { courseId: true }
  });
  const completedCourseIds = new Set(userCourseCompletions.map(c => c.courseId));

  const completedModulesByCourse = userModuleCompletions.reduce((acc, completion) => {
    const module = learningPath.courses.flatMap(c => c.course.modules).find(m => m.id === completion.moduleId);
    if (module) {
      if (!acc[module.courseId]) {
        acc[module.courseId] = new Set();
      }
      acc[module.courseId].add(module.id);
    }
    return acc;
  }, {} as Record<string, Set<string>>);


  const coursesWithProgress = learningPath.courses.map(({ course }) => {
      const isCompleted = completedCourseIds.has(course.id);
      if (isCompleted) {
        return { ...course, progress: 100, isCompleted };
      }
      const completedModuleCount = completedModulesByCourse[course.id]?.size || 0;
      const progress = course.modules.length > 0 ? Math.round((completedModuleCount / course.modules.length) * 100) : 0;
      return { ...course, progress, isCompleted };
  });

  const overallProgress = coursesWithProgress.length > 0
    ? Math.round(coursesWithProgress.reduce((sum, course) => sum + (course.isCompleted ? 100 : course.progress), 0) / coursesWithProgress.length)
    : 0;

  let firstUncompletedFound = false;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="outline" size="sm" className="mb-4">
            <Link href="/learning-paths">
                <MoveLeft className="mr-2 h-4 w-4" />
                Back to Learning Paths
            </Link>
        </Button>
        <h1 className="text-3xl font-bold font-headline">{learningPath.title}</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-3xl">
          {learningPath.description}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-muted-foreground">
          <span>Overall Progress</span>
          <span>{overallProgress}%</span>
        </div>
        <Progress value={overallProgress} />
      </div>

      <div>
        <h2 className="text-2xl font-semibold font-headline mb-4">Courses in this Path</h2>
        <div className="space-y-4">
          {coursesWithProgress.map((course, index) => {
            const isNextCourse = !course.isCompleted && !firstUncompletedFound;
            if (isNextCourse) {
              firstUncompletedFound = true;
            }
            const isLocked = !course.isCompleted && !isNextCourse;
            
            const displayImageUrl = course.imageUrl ?? course.product?.imageUrl;
            const displayImageHint = course.imageHint ?? course.product?.imageHint;
            const displayImageDescription = course.imageDescription ?? course.product?.description;


            return (
              <Card 
                key={course.id} 
                className={`flex flex-col md:flex-row items-center gap-6 p-6 transition-all ${isLocked ? 'opacity-50 bg-muted/50' : 'bg-card'}`}
              >
                <div className="relative w-full md:w-1/3 aspect-video shrink-0">
                  <Image
                    src={displayImageUrl ?? 'https://picsum.photos/seed/placeholder/600/400'}
                    alt={displayImageDescription ?? ''}
                    fill
                    className="rounded-lg object-cover"
                    data-ai-hint={displayImageHint ?? ''}
                  />
                </div>
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold font-headline">{course.title}</h3>
                    {course.isCompleted ? (
                      <Badge variant="secondary" className="flex items-center gap-2 shrink-0">
                        <CheckCircle className="h-4 w-4 text-green-500"/>
                        Completed
                      </Badge>
                    ) : isLocked ? (
                      <Badge variant="outline" className="flex items-center gap-2 shrink-0">
                        <Lock className="h-4 w-4"/>
                        Locked
                      </Badge>
                    ): null}
                  </div>
                  <p className="text-muted-foreground mt-1 mb-4">{course.description}</p>
                  
                  {isNextCourse ? (
                    <>
                      <div className="flex w-full items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Your Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2 w-full mb-4" />
                       <Button asChild size="lg" className="w-full sm:w-auto">
                        <Link href={`/courses/${course.id}`}>Start Course</Link>
                      </Button>
                    </>
                  ) : course.isCompleted ? (
                     <Button asChild variant="outline" className="w-full sm:w-auto">
                        <Link href={`/courses/${course.id}`}>Review Course</Link>
                      </Button>
                  ) : (
                    <Button disabled className="w-full sm:w-auto">Complete Previous Step</Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
        {coursesWithProgress.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                <p>No courses have been added to this learning path yet.</p>
            </div>
        )}
      </div>
    </div>
  )
}
