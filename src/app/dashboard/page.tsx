

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Radio } from 'lucide-react';
import Link from 'next/link';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';
import type { Course, Product, Module, UserCompletedModule, UserCompletedCourse, TrainingProvider, LearningPathCourse } from '@prisma/client';

type CourseWithProgress = Course & {
  progress: number;
  product: Product | null;
  modules: Module[];
  trainingProvider: TrainingProvider | null;
  isLocked: boolean;
  learningPathId?: string;
};

async function getDashboardData(userId: string, userProviderId: string | undefined | null, userRole: string): Promise<{
  courses: CourseWithProgress[];
  products: Product[];
  liveSessions: any[];
  trainingProviders: TrainingProvider[];
}> {
    let courseWhereClause: any = {
      status: 'PUBLISHED',
      OR: [
        { isPublic: true },
        { trainingProviderId: userProviderId }
      ]
    };
    
    // If the user is a super admin, they should see all published courses regardless of provider
    if (userRole === 'Super Admin') {
        courseWhereClause = {
            status: 'PUBLISHED',
        };
    } else if (!userProviderId) {
        // If a non-super-admin has no provider, only show public courses
        courseWhereClause = {
            status: 'PUBLISHED',
            isPublic: true,
        };
    }

    const courses = await prisma.course.findMany({
        where: courseWhereClause,
        include: { 
            modules: true, 
            product: true,
            trainingProvider: true
        }
    });

    const products = await prisma.product.findMany({
        orderBy: { name: 'asc' }
    });

    const trainingProviders = await prisma.trainingProvider.findMany({
        orderBy: { name: 'asc' }
    });

    const liveSessions = await prisma.liveSession.findMany({
        where: {
            dateTime: {
                gte: new Date(),
            },
        },
        orderBy: {
            dateTime: 'asc'
        }
    });
    
    const userCompletions = await prisma.userCompletedCourse.findMany({
        where: { userId: userId },
        select: { courseId: true, score: true }
    });
    const completedCourseIds = new Set(userCompletions.map(c => c.courseId));

    const userModuleCompletions = await prisma.userCompletedModule.findMany({
      where: { userId: userId },
      select: { moduleId: true }
    });

    const allLearningPathCourses = await prisma.learningPathCourse.findMany({
      include: { learningPath: true },
      orderBy: { order: 'asc' },
    });
    
    // Group courses by learning path
    const paths: Record<string, LearningPathCourse[]> = {};
    allLearningPathCourses.forEach(lpc => {
      if (!paths[lpc.learningPathId]) {
        paths[lpc.learningPathId] = [];
      }
      paths[lpc.learningPathId].push(lpc);
    });

    const lockedCourseMap = new Map<string, string>(); // Map<courseId, learningPathId>

    for (const pathId in paths) {
      const pathCourses = paths[pathId];
      let firstUncompletedFound = false;
      for (const lpc of pathCourses) {
        if (!completedCourseIds.has(lpc.courseId)) {
          if (firstUncompletedFound) {
            // This course is locked because a prior one is not done
            lockedCourseMap.set(lpc.courseId, pathId);
          }
          firstUncompletedFound = true;
        }
      }
    }


    const completedModulesByCourse = userModuleCompletions.reduce((acc, completion) => {
      const module = courses.flatMap(c => c.modules).find(m => m.id === completion.moduleId);
      if (module) {
        if (!acc[module.courseId]) {
          acc[module.courseId] = new Set();
        }
        acc[module.courseId].add(module.id);
      }
      return acc;
    }, {} as Record<string, Set<string>>);
    
    const completionsMap = new Map(userCompletions.map(c => [c.courseId, c.score]));

    const coursesWithProgress = courses.map(course => {
        let progress = 0;
        if (completionsMap.has(course.id)) {
            progress = 100;
        } else {
            const completedModuleCount = completedModulesByCourse[course.id]?.size || 0;
            progress = course.modules.length > 0 ? Math.round((completedModuleCount / course.modules.length) * 100) : 0;
        }

        const isLocked = lockedCourseMap.has(course.id);
        const learningPathId = lockedCourseMap.get(course.id);

        return { ...course, progress, isLocked, learningPathId };
    });

    return {
        courses: coursesWithProgress,
        products,
        liveSessions,
        trainingProviders,
    }
}


export default async function DashboardPage() {
  const currentUser = await getSession();
  
  if (!currentUser) {
    redirect('/login');
  }

  const { courses, products, liveSessions, trainingProviders } = await getDashboardData(currentUser.id, currentUser.trainingProviderId, currentUser.role.name);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">
          Continue your learning journey and stay updated with live events.
        </p>
      </div>

      <DashboardClient courses={courses} products={products} trainingProviders={trainingProviders} />

      <section>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Upcoming Live Sessions</CardTitle>
            <CardDescription>
              Join live sessions with experts to deepen your knowledge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {liveSessions.map((session) => (
                <li key={session.id} className="flex flex-col items-start gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                     <div className="bg-primary/10 p-2 rounded-full">
                        <Radio className="h-6 w-6 text-primary" />
                     </div>
                     <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.dateTime).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                     </div>
                  </div>
                  <div className="flex gap-2 sm:ml-auto">
                    <Button asChild variant="outline">
                        <Link href="/live-sessions">Details</Link>
                    </Button>
                    <Button asChild>
                        <a href={session.joinUrl} target="_blank" rel="noopener noreferrer">Join Now</a>
                    </Button>
                  </div>
                </li>
              ))}
               {liveSessions.length === 0 && (
                  <li className="text-center text-muted-foreground py-8">
                    No upcoming live sessions scheduled.
                  </li>
               )}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
