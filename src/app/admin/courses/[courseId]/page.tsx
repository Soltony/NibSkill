
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CourseDetailAdminClient } from './course-detail-admin-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveLeft } from 'lucide-react';

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
  
  // This data is for the mock progress bar, it is not user-specific
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

export default async function CourseDetailAdminPage({ 
    params,
    searchParams 
}: { 
    params: { courseId: string };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  const permissions = session?.role.permissions as any;
  if (!session || !permissions?.courses?.r) {
    notFound();
  }
  
  const { courseId } = params;
  const data = await getCourseData(courseId);
  const fromApprovals = searchParams.from === 'approvals';

  if (!data || !data.course) {
    notFound();
  }

  // A simplified progress metric for admin view (e.g., based on one user or average)
  const totalUsersWithProgress = new Set(data.completedModules.map(cm => cm.userId)).size;

  const backLink = fromApprovals ? "/admin/courses/approvals" : "/admin/courses/list";

  return (
    <div className="space-y-8">
        <Button asChild variant="outline" size="sm">
            <Link href={backLink}>
                <MoveLeft className="mr-2 h-4 w-4" />
                Back to {fromApprovals ? 'Approvals' : 'Courses'}
            </Link>
        </Button>
        <CourseDetailAdminClient 
            initialCourse={data.course}
            initialProgress={totalUsersWithProgress > 0 ? 50 : 0} // Mock progress for admin
            reviewMode={fromApprovals}
        />
    </div>
  );
}
