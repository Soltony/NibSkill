
import { CourseCard } from '@/components/course-card';
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
import type { Course, LiveSession } from '@prisma/client';

// In a real app, this would come from an authentication system
async function getCurrentUser() {
    return await prisma.user.findFirst({
        where: { role: { name: 'Staff' } },
    });
}

async function getDashboardData() {
    const courses = await prisma.course.findMany({
        include: { modules: true }
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

    // We'll calculate progress on the server for simplicity. 
    // In a real app, this would be a more complex query based on user progress records.
    const coursesWithProgress = courses.map(course => {
        const completedModules = course.modules.filter((m, i) => i < course.title.length % course.modules.length).length;
        const progress = course.modules.length > 0 ? Math.round((completedModules / course.modules.length) * 100) : 0;
        return { ...course, progress };
    });

    return {
        courses: coursesWithProgress,
        liveSessions,
    }
}


export default async function DashboardPage() {
  const currentUser = await getCurrentUser();
  const { courses, liveSessions } = await getDashboardData();
  
  if (!currentUser) {
    return <div>Could not find staff user. Please seed the database.</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {currentUser.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">
          Continue your learning journey and stay updated with live events.
        </p>      </div>

      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">My Courses</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

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
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
