
"use client";

import { useState, useEffect } from 'react';
import { Course, LiveSession, User, users } from '@/lib/data';
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

function ClientFormattedDate({ date }: { date: Date }) {
  const [formattedDate, setFormattedDate] = useState("");

  useEffect(() => {
    setFormattedDate(
      new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }, [date]);

  if (!formattedDate) {
    return null; // or a loading skeleton
  }

  return <>{formattedDate}</>;
}

// Mock function to simulate fetching data
const getDashboardData = async (): Promise<{ courses: Course[], liveSessions: LiveSession[], currentUser: User }> => {
  // In a real app, you'd fetch this from your database
  const { courses, liveSessions, users } = await import('@/lib/data');
  return {
    courses: courses,
    liveSessions: liveSessions.filter(s => new Date(s.dateTime) > new Date()),
    currentUser: users.find(u => u.role === 'staff')!
  };
}


export default function DashboardPage() {
  const [data, setData] = useState<{ courses: Course[], liveSessions: LiveSession[], currentUser: User | null }>({
    courses: [],
    liveSessions: [],
    currentUser: null
  });

  useEffect(() => {
    const fetchData = async () => {
      // For demonstration, we use mock data. In a real app, you would fetch from an API.
      const { courses: initialCourses, liveSessions: initialLiveSessions, users: initialUsers } = await import('@/lib/data');
      setData({
        courses: initialCourses,
        liveSessions: initialLiveSessions,
        currentUser: initialUsers.find(u => u.role === 'staff')!
      });
    };
    fetchData();
  }, []);
  
  if (!data.currentUser) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {data.currentUser.name.split(' ')[0]}!</h1>
        <p className="text-muted-foreground">
          Continue your learning journey and stay updated with live events.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-semibold font-headline mb-4">My Courses</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.courses.map((course) => (
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
              {data.liveSessions.map((session) => (
                <li key={session.id} className="flex flex-col items-start gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                     <div className="bg-primary/10 p-2 rounded-full">
                        <Radio className="h-6 w-6 text-primary" />
                     </div>
                     <div>
                        <h3 className="font-semibold">{session.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          <ClientFormattedDate date={session.dateTime} />
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
