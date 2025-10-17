
import { notFound, redirect } from "next/navigation"
import prisma from "@/lib/db"
import { Progress } from "@/components/ui/progress"
import { CourseCard } from "@/components/course-card"
import { MoveLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { getSession } from "@/lib/auth"

export default async function LearningPathDetailPage({ params }: { params: { pathId: string } }) {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }
  
  const learningPath = await prisma.learningPath.findUnique({
    where: { id: params.pathId },
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
  const userModuleCompletions = await prisma.userCompletedModule.findMany({
    where: { 
      userId: user.id,
      moduleId: {
        in: learningPath.courses.flatMap(c => c.course.modules.map(m => m.id))
      }
    },
    select: { moduleId: true }
  });

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
      const completedModuleCount = completedModulesByCourse[course.id]?.size || 0;
      const progress = course.modules.length > 0 ? Math.round((completedModuleCount / course.modules.length) * 100) : 0;
      return { ...course, progress };
  });

  const overallProgress = coursesWithProgress.length > 0
    ? Math.round(coursesWithProgress.reduce((sum, course) => sum + course.progress, 0) / coursesWithProgress.length)
    : 0;

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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {coursesWithProgress.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
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
