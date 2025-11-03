
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CourseDetailClient } from './course-detail-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveLeft } from 'lucide-react';

async function getCourseData(courseId: string, userId: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: {
            createdAt: 'asc'
        }
      },
      product: true,
      quiz: {
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    return { course: null, completedModules: [], user: null };
  }

  const completedModules = await prisma.userCompletedModule.findMany({
    where: {
      userId: userId,
      moduleId: {
        in: course.modules.map((m) => m.id),
      },
    },
    select: { moduleId: true },
  });

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { role: true }
  });

  return { course, completedModules, user };
}

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { courseId } = params;
  const { course, completedModules, user } = await getCourseData(courseId, session.id);

  if (!course || !user) {
    notFound();
  }

  return (
    <div className="space-y-8">
        <Button asChild variant="outline" size="sm">
            <Link href="/courses">
                <MoveLeft className="mr-2 h-4 w-4" />
                Back to Courses
            </Link>
        </Button>
        <CourseDetailClient 
            courseData={{ course, completedModules, user }} 
        />
    </div>
  );
}
