
import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CourseDetailClient } from './course-detail-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveLeft } from 'lucide-react';
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


async function getCourseData(courseId: string, userId?: string) {
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
      completedBy: {
        where: {
          userId: userId,
        }
      }
    },
  });

  if (!course) {
    return { course: null, completedModules: [], user: null, previousAttempts: [], resetRequest: null };
  }

  // If there's a logged-in user, fetch their specific data
  if (userId) {
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
      include: { 
        roles: {
          include: {
            role: true,
          },
        },
       }
    });

    const resetRequest = await prisma.resetRequest.findFirst({
      where: {
        userId: userId,
        courseId: courseId,
        status: 'PENDING'
      }
    });

    return { course, completedModules, user, previousAttempts: course.completedBy, resetRequest };
  }

  // If no user, it's a guest session, return course data with empty user-specific fields
  return { course, completedModules: [], user: null, previousAttempts: [], resetRequest: null };
}

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const session = await getSession();
  const guestSessionToken = cookies().get('miniapp_guest_session')?.value;

  if (!session && !guestSessionToken) {
    redirect('/login');
  }

  const { courseId } = params;
  const { course, completedModules, user, previousAttempts, resetRequest } = await getCourseData(courseId, session?.id);

  if (!course) {
    notFound();
  }

  return (
    <div className="space-y-8">
        <Button asChild variant="outline" size="sm">
            <Link href="/dashboard">
                <MoveLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
        <CourseDetailClient 
            courseData={{ course, completedModules, user, previousAttempts, resetRequest } as any} 
        />
    </div>
  );
}
