
"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import {
  courses as initialCourses,
  learningPaths as initialLearningPaths,
  type Course,
  type LearningPath,
} from "@/lib/data"
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

const COURSES_STORAGE_KEY = "skillup-courses"
const LEARNING_PATHS_STORAGE_KEY = "skillup-learning-paths"

const LearningPathCard = ({ path, courses }: { path: LearningPath, courses: Course[]}) => {

    const progress = useMemo(() => {
        const pathCourses = courses.filter(c => path.courseIds.includes(c.id));
        if (pathCourses.length === 0) return 0;
        const totalProgress = pathCourses.reduce((sum, course) => sum + course.progress, 0);
        return Math.round(totalProgress / pathCourses.length);
    }, [path, courses]);

    return (
    <Link href={`/learning-paths/${path.id}`} className="block h-full transition-transform hover:scale-[1.02]">
        <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-xl">
            <CardHeader>
                <BookMarked className="h-8 w-8 text-accent mb-2" />
                <CardTitle className="font-headline text-xl">{path.title}</CardTitle>
                <CardDescription>{path.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{path.courseIds.length} {path.courseIds.length === 1 ? 'course' : 'courses'}</p>
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-2">
                 <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span>{progress}%</span>
                </div>
                <Progress value={progress} />
            </CardFooter>
        </Card>
    </Link>
    )
}


export default function LearningPathsPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY)
    setCourses(storedCourses ? JSON.parse(storedCourses) : initialCourses)

    const storedPaths = localStorage.getItem(LEARNING_PATHS_STORAGE_KEY)
    setLearningPaths(
      storedPaths ? JSON.parse(storedPaths) : initialLearningPaths
    )
    setIsLoaded(true)
  }, [])

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
            <LearningPathCard key={path.id} path={path} courses={courses} />
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
