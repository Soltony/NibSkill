
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
import type { Course, Product, Module, UserCompletedModule, UserCompletedCourse, TrainingProvider, LearningPathCourse, Role, UserRole } from '@prisma/client';
import { cookies } from 'next/headers';
import { jwtVerify, type JWTPayload } from 'jose';

interface GuestJwtPayload extends JWTPayload {
  phoneNumber: string;
  authToken: string;
}

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
    return new TextEncoder().encode(secret);
};

type CourseWithProgress = Course & {
  progress: number;
  product: Product | null;
  modules: Module[];
  trainingProvider: TrainingProvider | null;
  isLocked: boolean;
  learningPathId?: string;
};

type UserWithRoles = User & { roles: (UserRole & {role: Role})[] };


async function getDashboardData(user?: UserWithRoles | null): Promise<{
  courses: CourseWithProgress[];
  products: Product[];
  liveSessions: any[];
  trainingProviders: TrainingProvider[];
}> {
    const courses = await prisma.course.findMany({
        where: { status: 'PUBLISHED', isPublic: true },
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
            isRestricted: false, // Guests can only see public sessions
        },
        orderBy: {
            dateTime: 'asc'
        }
    });
    
    // If no user, return public data only (progress is 0 for all)
    if (!user) {
        const coursesWithProgress = courses.map(course => ({ ...course, progress: 0, isLocked: false }));
        return { courses: coursesWithProgress, products, liveSessions, trainingProviders };
    }

    // If there is a user, calculate their specific progress
    const userCompletions = await prisma.userCompletedCourse.findMany({
        where: { userId: user.id },
        select: { courseId: true, score: true }
    });
    const completedCourseIds = new Set(userCompletions.map(c => c.courseId));

    const userModuleCompletions = await prisma.userCompletedModule.findMany({
      where: { userId: user.id },
      select: { moduleId: true }
    });

    const allLearningPathCourses = await prisma.learningPathCourse.findMany({
      include: { learningPath: true },
      orderBy: { order: 'asc' },
    });
    
    const paths: Record<string, LearningPathCourse[]> = {};
    allLearningPathCourses.forEach(lpc => {
      if (!paths[lpc.learningPathId]) {
        paths[lpc.learningPathId] = [];
      }
      paths[lpc.learningPathId].push(lpc);
    });

    const lockedCourseMap = new Map<string, string>();

    for (const pathId in paths) {
      const pathCourses = paths[pathId];
      let firstUncompletedFound = false;
      for (const lpc of pathCourses) {
        if (!completedCourseIds.has(lpc.courseId)) {
          if (firstUncompletedFound) {
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
        liveSessions, // This will be public sessions if user is a guest
        trainingProviders,
    }
}


export default async function DashboardPage() {
  const session = await getSession();
  const guestSessionToken = cookies().get('miniapp_guest_session')?.value;
  let isGuest = false;
  let userName = "Guest";

  // If no full session, check for a guest session.
  if (!session) {
    if (guestSessionToken) {
      try {
        await jwtVerify<GuestJwtPayload>(guestSessionToken, getJwtSecret());
        isGuest = true;
      } catch (e) {
        redirect('/login'); // Invalid guest token
      }
    } else {
      redirect('/login'); // No session at all
    }
  } else {
    userName = session.name.split(' ')[0];
  }


  const { courses, products, liveSessions, trainingProviders } = await getDashboardData(session || undefined);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome{isGuest ? '' : `, ${userName}`}!</h1>
        <p className="text-muted-foreground">
          {isGuest ? 'Explore our available courses.' : 'Continue your learning journey and stay updated with live events.'}
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
