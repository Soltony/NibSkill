
import Link from "next/link"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { LearningPathsClient, type LearningPathWithProgress } from "./learning-paths-client"

async function getLearningPathsData(userId: string) {

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
  
  if (!learningPaths.length) {
    return [];
  }

  const allCourseIdsInPaths = learningPaths.flatMap(path => path.courses.map(c => c.course.id));
  
  const userCourseCompletions = await prisma.userCompletedCourse.findMany({
    where: {
      userId: userId,
      courseId: { in: allCourseIdsInPaths }
    },
    select: { courseId: true }
  });

  const completedCourseIds = new Set(userCourseCompletions.map(c => c.courseId));

  const pathsWithProgress: LearningPathWithProgress[] = learningPaths.map(path => {
    const coursesInPath = path.courses.length;
    const completedCoursesInPath = path.courses.filter(c => completedCourseIds.has(c.course.id)).length;
    
    const overallProgress = coursesInPath > 0
      ? Math.round((completedCoursesInPath / coursesInPath) * 100)
      : 0;
    
    return {
      ...path,
      progress: overallProgress,
    };
  });

  return pathsWithProgress;
}


export default async function LearningPathsPage() {
  const user = await getSession();
  if (!user) {
    redirect('/login');
  }

  const learningPaths = await getLearningPathsData(user.id);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Learning Paths</h1>
        <p className="text-muted-foreground">
          Follow guided paths to build your skills progressively.
        </p>
      </div>

       <LearningPathsClient learningPaths={learningPaths} />
    </div>
  )
}
