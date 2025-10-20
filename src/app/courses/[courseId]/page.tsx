
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CourseDetailClient } from './course-detail-client';

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

  const user = await prisma.user.findUnique({ where: { id: userId }});

  return { course, completedModules, user };
}

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { courseId } = await params;
  const { course, completedModules, user } = await getCourseData(courseId, session.id);

  if (!course || !user) {
    notFound();
  }

  return (
    <CourseDetailClient 
        courseData={{ course, completedModules, user }} 
    />
  );
}
