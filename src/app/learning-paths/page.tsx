
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

    const courseIds = path.courses.map((c: any) => c.course.id);
    const userModuleCompletions = await prisma.userCompletedModule.findMany({
      where: { 
        userId: userId,
        moduleId: {
          in: path.courses.flatMap((c: any) => c.course.modules.map((m: any) => m.id))
        }
      },
      select: { moduleId: true }
    });

    const completedModulesByCourse = userModuleCompletions.reduce((acc, completion) => {
      const module = path.courses.flatMap((c: any) => c.course.modules).find((m: any) => m.id === completion.moduleId);
      if (module) {
        if (!acc[module.courseId]) {
          acc[module.courseId] = new Set();
        }
        acc[module.courseId].add(module.id);
      }
      return acc;
    }, {} as Record<string, Set<string>>);

    const coursesWithProgress = path.courses.map(({ course }: any) => {
        const completedModuleCount = completedModulesByCourse[course.id]?.size || 0;
        const progress = course.modules.length > 0 ? Math.round((completedModuleCount / course.modules.length) * 100) : 0;
        return { ...course, progress };
    });
    
    const overallProgress = coursesWithProgress.length > 0
        ? Math.round(coursesWithProgress.reduce((sum: number, course: any) => sum + course.progress, 0) / coursesWithProgress.length)
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
                course: { 
                    include: { modules: true } 
                } 
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
