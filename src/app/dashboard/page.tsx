
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
import type { Course, Product, Module, UserCompletedModule, UserCompletedCourse } from '@prisma/client';

type CourseWithProgress = Course & {
  progress: number;
  product: Product | null;
  modules: Module[];
};

async function getDashboardData(userId: string): Promise<{
  courses: CourseWithProgress[];
  products: Product[];
  liveSessions: any[];
}> {
    const courses = await prisma.course.findMany({
        include: { modules: true, product: true }
    });

    const products = await prisma.product.findMany({
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

    const userModuleCompletions = await prisma.userCompletedModule.findMany({
      where: { userId: userId },
      select: { moduleId: true }
    });

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
        if (completionsMap.has(course.id)) {
            return { ...course, progress: 100 };
        }
        const completedModuleCount = completedModulesByCourse[course.id]?.size || 0;
        const progress = course.modules.length > 0 ? Math.round((completedModuleCount / course.modules.length) * 100) : 0;
        return { ...course, progress };
    });

    return {
        courses: coursesWithProgress,
        products,
        liveSessions,
    }
}


export default async function DashboardPage() {
  const currentUser = await getSession();
  
  if (!currentUser) {
    redirect('/login');
  }

  const { courses, products, liveSessions } = await getDashboardData(currentUser.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">
          Continue your learning journey and stay updated with live events.
        </p>
      </div>

      <DashboardClient courses={courses} products={products} />

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
