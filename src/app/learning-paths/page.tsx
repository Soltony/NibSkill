
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

async function LearningPathCard({ path }: { path: any }) {

    const totalProgress = path.courses.reduce((sum: number, courseRelation: any) => {
        const course = courseRelation.course;
        // Mock progress
        const completedModules = course.modules.filter((m: any, i: number) => i < course.title.length % course.modules.length).length;
        return sum + (course.modules.length > 0 ? (completedModules / course.modules.length) * 100 : 0);
    }, 0);

    const overallProgress = path.courses.length > 0 ? Math.round(totalProgress / path.courses.length) : 0;


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
            <LearningPathCard key={path.id} path={path} />
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
