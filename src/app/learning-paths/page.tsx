
import Link from "next/link"
import prisma from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BookMarked } from "lucide-react"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

async function LearningPathCard({ path, userId }: { path: any, userId: string }) {

    const userCourseCompletions = await prisma.userCompletedCourse.findMany({
        where: {
            userId: userId,
            courseId: { in: path.courses.map((c: any) => c.course.id) }
        },
        select: { courseId: true }
    });

    const completedCourseIds = new Set(userCourseCompletions.map(c => c.courseId));
    const coursesInPath = path.courses.length;
    const completedCoursesInPath = path.courses.filter((c: any) => completedCourseIds.has(c.course.id)).length;
    
    const overallProgress = coursesInPath > 0 
        ? Math.round((completedCoursesInPath / coursesInPath) * 100)
        : 0;

    return (
        <Link href={`/learning-paths/${path.id}`} className="block h-full transition-transform hover:scale-[1.02]">
            <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl">
                <CardHeader>
                    <BookMarked className="h-8 w-8 text-accent mb-2" />
                    <CardTitle className="font-headline text-xl">{path.title}</CardTitle>
                    <CardDescription>{path.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{path.courses.length} {path.courses.length === 1 ? 'course' : 'courses'}</p>
                </CardContent>
                <CardFooter className="flex flex-col items-start gap-2">
                    <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>{overallProgress}%</span>
                    </div>
                    <Progress value={overallProgress} />
                </CardFooter>
            </Card>
        </Link>
    )
}

export default async function LearningPathsPage() {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }

  const learningPaths = await prisma.learningPath.findMany({
    include: { 
        courses: { 
            include: { 
                course: true
            } 
        } 
    },
    orderBy: { title: 'asc' }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Learning Paths</h1>
        <p className="text-muted-foreground">
          Follow guided paths to build your skills progressively.
        </p>
      </div>

       <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {learningPaths.map((path) => (
            <LearningPathCard key={path.id} path={path} userId={user.id} />
          ))}
        </div>
        {learningPaths.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg">
                <p className="text-lg">No learning paths are available yet.</p>
                <p>Please check back later.</p>
            </div>
        )}
    </div>
  )
}
