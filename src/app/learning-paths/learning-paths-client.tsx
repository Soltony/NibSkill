
"use client";

import Link from "next/link"
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
import type { LearningPath, LearningPathCourse, Course } from "@prisma/client"

export type LearningPathWithProgress = LearningPath & {
    courses: (LearningPathCourse & { course: Course })[];
    progress: number;
}

function LearningPathCard({ path }: { path: LearningPathWithProgress }) {
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
                        <span>{path.progress}%</span>
                    </div>
                    <Progress value={path.progress} />
                </CardFooter>
            </Card>
        </Link>
    )
}

export function LearningPathsClient({ learningPaths }: { learningPaths: LearningPathWithProgress[] }) {

  if (learningPaths.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg">
          <p className="text-lg">No learning paths are available yet.</p>
          <p>Please check back later.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {learningPaths.map((path) => (
        <LearningPathCard key={path.id} path={path} />
      ))}
    </div>
  )
}
