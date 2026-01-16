

import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { hasAccessToCourse } from '@/lib/authorization';
import { CourseDetailClient } from './course-detail-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveLeft } from 'lucide-react';
import { cookies } from 'next/headers';

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
    return { course: null, completedModules: [], user: null, previousAttempts: [], resetRequest: null, isPurchased: false, isPartOfLearningPath: false, pendingSubmission: null };
  }
  
  const isPartOfLearningPath = await prisma.learningPathCourse.count({
    where: { courseId: courseId }
  }) > 0;


  // If there's no user, it's a guest session, return public data only
  if (!userId) {
    return { course, completedModules: [], user: null, previousAttempts: [], resetRequest: null, isPurchased: false, isPartOfLearningPath, pendingSubmission: null };
  }
  
  // If there's a logged-in user, fetch their specific data
  const [completedModules, user, resetRequest, purchaseRecord, pendingSubmission] = await Promise.all([
    prisma.userCompletedModule.findMany({
      where: {
        userId: userId,
        moduleId: { in: course.modules.map((m) => m.id) },
      },
      select: { moduleId: true },
    }),
    prisma.user.findUnique({ 
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    }),
    prisma.resetRequest.findFirst({
      where: { userId: userId, courseId: courseId, status: 'PENDING' }
    }),
    course.isPaid ? prisma.userPurchasedCourse.findUnique({
      where: { userId_courseId: { userId, courseId } }
    }) : Promise.resolve(null),
    course.quiz ? prisma.quizSubmission.findFirst({
      where: {
        userId: userId,
        quizId: course.quiz.id,
        status: 'PENDING_REVIEW'
      }
    }) : Promise.resolve(null)
  ]);

  return { 
    course, 
    completedModules, 
    user, 
    previousAttempts: course.completedBy, 
    resetRequest,
    isPurchased: !!purchaseRecord,
    isPartOfLearningPath,
    pendingSubmission,
  };
}

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const session = await getSession();
  const guestSessionToken = cookies().get('miniapp_guest_session')?.value;

  if (!session && !guestSessionToken) {
    redirect('/login');
  }

  const { courseId } = params;
  const courseData = await getCourseData(courseId, session?.id);

  if (!courseData.course) {
    notFound();
  }

  const accessOk = await hasAccessToCourse(prisma, session?.id, courseId);
  if (!accessOk) {
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
            courseData={courseData as any} 
        />
    </div>
  );
}


