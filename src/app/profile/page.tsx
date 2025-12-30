

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Award, BookOpenCheck, CheckCircle, Footprints, Target, Trophy, FileText, MoveLeft } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import prisma from "@/lib/db"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ProfileTabs } from "./profile-tabs"

async function getProfileData(userId: string) {
    const user = await prisma.user.findFirst({
        where: { id: userId },
        include: { department: true }
    });

    if (!user) {
        return { currentUser: null, completedCourses: [], userBadges: [], learningPathCourseIds: [], completedLearningPaths: [] };
    }

    const completedCourses = await prisma.userCompletedCourse.findMany({
        where: { userId: user.id },
        include: { 
            course: {
                include: {
                    quiz: true,
                }
            } 
        },
        orderBy: { completionDate: 'desc' }
    });

    const userBadges = await prisma.userBadge.findMany({
        where: { userId: user.id },
        include: { badge: true }
    });
    
    // Get all learning paths and their courses
    const allLearningPaths = await prisma.learningPath.findMany({
      where: { hasCertificate: true },
      include: {
        courses: {
          include: {
            course: {
              include: {
                quiz: {
                  select: {
                    passingScore: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    const userCompletionsMap = new Map(completedCourses.map(c => [c.courseId, c.score]));
    
    // Determine which learning paths are fully completed by the user
    const completedLearningPathIds = allLearningPaths.filter(path => 
      path.courses.every(({ course }) => {
        const score = userCompletionsMap.get(course.id);
        if (score === undefined) return false; // Not completed
        if (course.quiz) {
            return score >= (course.quiz.passingScore ?? 0);
        }
        return true; // Completed if no quiz
      })
    ).map(path => path.id);


    return { 
        currentUser: user, 
        completedCourses, 
        userBadges, 
        learningPathCourseIds: allLearningPaths.flatMap(p => p.courses.map(c => c.courseId)),
        completedLearningPaths: completedLearningPathIds,
    };
}

export default async function ProfilePage() {
  const sessionUser = await getSession();
  if (!sessionUser) {
    redirect('/login');
  }

  const { currentUser, completedCourses, userBadges, learningPathCourseIds, completedLearningPaths } = await getProfileData(sessionUser.id);

  if (!currentUser) {
    return <div>Could not find user data. Please try logging in again.</div>
  }
  
  const { password, ...userSafeForClient } = currentUser;


  return (
    <div className="space-y-8">
        <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
                <MoveLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
       <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-primary">
          <AvatarImage src={currentUser.avatarUrl ?? ''} alt={currentUser.name} />
          <AvatarFallback className="text-3xl">
            {currentUser.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-4xl font-bold font-headline">{currentUser.name}</h1>
          <p className="text-lg text-muted-foreground">{currentUser.department?.name || 'No Department'}</p>
        </div>
      </div>
      
      <ProfileTabs 
        user={userSafeForClient}
        completedCourses={completedCourses}
        userBadges={userBadges}
        learningPathCourseIds={learningPathCourseIds}
        completedLearningPaths={completedLearningPaths}
      />

    </div>
  )
}
