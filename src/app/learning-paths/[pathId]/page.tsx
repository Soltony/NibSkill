
import { notFound } from "next/navigation"
import prisma from "@/lib/db"
import { Progress } from "@/components/ui/progress"
import { CourseCard } from "@/components/course-card"
import { MoveLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function LearningPathDetailPage({ params }: { params: { pathId: string } }) {
  const learningPath = await prisma.learningPath.findUnique({
    where: { id: params.pathId },
    include: { courses: { include: { course: { include: { modules: true } } } } },
  })

  if (!learningPath) {
    notFound();
  }

  const coursesWithProgress = await Promise.all(
    learningPath.courses.map(async ({ course }) => {
        // This is a placeholder for actual user progress tracking
        const completedModules = course.modules.filter((m, i) => i < course.title.length % course.modules.length).length;
        const progress = course.modules.length > 0 ? Math.round((completedModules / course.modules.length) * 100) : 0;
        return { ...course, progress };
    })
  );

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

    