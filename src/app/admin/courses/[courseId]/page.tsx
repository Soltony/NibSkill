
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CourseDetailAdminClient } from './course-detail-admin-client';

async function getCourseData(courseId: string) {
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
    return null;
  }
  
  const completedModules = await prisma.userCompletedModule.findMany({
    where: {
      moduleId: {
        in: course.modules.map((m) => m.id),
      },
    },
    select: { moduleId: true, userId: true },
  });

  return { course, completedModules };
}

export default async function CourseDetailAdminPage({ params }: { params: { courseId: string } }) {
  const session = await getSession();
  if (!session || session.role.toLowerCase() !== 'admin') {
    notFound();
  }
  
  const { courseId } = params;
  const data = await getCourseData(courseId);

  if (!data || !data.course) {
    notFound();
  }

  // A simplified progress metric for admin view (e.g., based on one user or average)
  const totalUsersWithProgress = new Set(data.completedModules.map(cm => cm.userId)).size;


  return (
    <CourseDetailAdminClient 
        initialCourse={data.course}
        initialProgress={totalUsersWithProgress > 0 ? 50 : 0} // Mock progress for admin
    />
  );
}
