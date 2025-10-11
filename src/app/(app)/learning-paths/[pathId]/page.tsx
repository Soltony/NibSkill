
"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams } from "next/navigation"
import {
  courses as initialCourses,
  learningPaths as initialLearningPaths,
  type Course,
  type LearningPath,
} from "@/lib/data"
import { Progress } from "@/components/ui/progress"
import { CourseCard } from "@/components/course-card"
import { MoveLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const COURSES_STORAGE_KEY = "skillup-courses"
const LEARNING_PATHS_STORAGE_KEY = "skillup-learning-paths"

export default function LearningPathDetailPage() {
  const params = useParams()
  const pathId = params.pathId as string

  const [learningPath, setLearningPath] = useState<LearningPath | undefined>()
  const [coursesInPath, setCoursesInPath] = useState<Course[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const storedPaths = localStorage.getItem(LEARNING_PATHS_STORAGE_KEY)
    const paths = storedPaths
      ? JSON.parse(storedPaths)
      : initialLearningPaths
    setLearningPath(paths.find((p: LearningPath) => p.id === pathId))

    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY)
    const allCourses = storedCourses
      ? JSON.parse(storedCourses)
      : initialCourses
    
    const currentPath = paths.find((p: LearningPath) => p.id === pathId);
    if (currentPath) {
        const filteredCourses = allCourses.filter((c: Course) => currentPath.courseIds.includes(c.id));
        setCoursesInPath(filteredCourses);
    }

    setIsLoaded(true)
  }, [pathId])

  const overallProgress = useMemo(() => {
    if (!coursesInPath || coursesInPath.length === 0) return 0
    const totalProgress = coursesInPath.reduce(
      (sum, course) => sum + course.progress,
      0
    )
    return Math.round(totalProgress / coursesInPath.length)
  }, [coursesInPath])

  if (!isLoaded || !learningPath) {
    return <div>Loading...</div>
  }

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
          {coursesInPath.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
        {coursesInPath.length === 0 && (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                <p>No courses have been added to this learning path yet.</p>
            </div>
        )}
      </div>
    </div>
  )
}
