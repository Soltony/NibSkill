
import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Progress } from "@/components/ui/progress"
import { MoveLeft, CheckCircle, Lock, Award } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getSession } from "@/lib/auth"
import {
  Card,
} from "@/components/ui/card"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default async function LearningPathDetailPage({ params }: { params: { pathId: string } }) {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }

  const { pathId } = params;
  
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
  
  const userCourseCompletions = await prisma.userCompletedCourse.findMany({
      where: {
          userId: user.id,
          courseId: { in: courseIds }
      },
      select: { courseId: true }
  });
  const completedCourseIds = new Set(userCourseCompletions.map(c => c.courseId));

  const coursesWithProgress = learningPath.courses.map(({ course }) => {
      const isCompleted = completedCourseIds.has(course.id);
      return { ...course, isCompleted };
  });

  const allCoursesInPathCompleted = coursesWithProgress.every(c => c.isCompleted);
  const coursesInPath = coursesWithProgress.length;
  const completedCoursesInPath = coursesWithProgress.filter(c => c.isCompleted).length;
  
  const overallProgress = coursesInPath > 0 
    ? Math.round((completedCoursesInPath / coursesInPath) * 100)
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
          {coursesWithProgress.map((course) => {
            let isLocked = false;
            if (firstUncompletedFound) {
                isLocked = true;
            } else if (!course.isCompleted) {
                firstUncompletedFound = true;
            }
            
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
                  
                  {!isLocked ? (
                     <Button asChild variant={course.isCompleted ? "outline" : "default"} size="lg" className="w-full sm:w-auto">
                        <Link href={`/courses/${course.id}`}>{course.isCompleted ? 'Review Course' : 'Start Course'}</Link>
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

      {allCoursesInPathCompleted && learningPath.hasCertificate && (
        <div className="text-center py-6">
          <Button size="lg" asChild>
            <Link href={`/learning-paths/${pathId}/certificate`}>
              <Award className="mr-2 h-5 w-5" />
              View Certificate
            </Link>
          </Button>
        </div>
      )}
    </div>
  )
}
