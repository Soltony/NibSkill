

import { notFound, redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { CourseDetailClient } from './course-detail-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MoveLeft } from 'lucide-react';
import { cookies } from 'next/headers';

async function getCourseData(courseId: string, userId?: string, isMiniApp: boolean = false) {
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
    return { course: null, completedModules: [], user: null, previousAttempts: [], resetRequest: null, isPurchased: false };
  }

  // Enforce visibility rules
  const purchasedCourseIds = userId 
      ? (await prisma.userPurchasedCourse.findMany({ 
            where: { userId: userId }, 
            select: { courseId: true } 
        })).map(p => p.courseId)
      : [];

  const isPurchased = purchasedCourseIds.includes(courseId);

  if (isMiniApp) {
      if (!course.isPaid) {
          // Hide free courses from mini-app
          return { course: null, completedModules: [], user: null, previousAttempts: [], resetRequest: null, isPurchased: false };
      }
  } else { // Web version
      if (course.isPaid && !isPurchased) {
          // Hide un-purchased paid courses from web
          return { course: null, completedModules: [], user: null, previousAttempts: [], resetRequest: null, isPurchased: false };
      }
  }


  // If there's no user, it's a guest session, return public data only
  if (!userId) {
    return { course, completedModules: [], user: null, previousAttempts: [], resetRequest: null, isPurchased: false };
  }
  
  // If there's a logged-in user, fetch their specific data
  const [completedModules, user, resetRequest] = await Promise.all([
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
  ]);

  return { 
    course, 
    completedModules, 
    user, 
    previousAttempts: course.completedBy, 
    resetRequest,
    isPurchased: isPurchased,
  };
}

export default async function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const session = await getSession();
  const cookieStore = await cookies();
  const guestSessionToken = cookieStore.get('miniapp_guest_session')?.value;
  let isMiniApp = false;

  if (guestSessionToken) {
    isMiniApp = true;
  }

  // A user must be logged in or be a guest in the mini-app
  if (!session && !guestSessionToken) {
    redirect('/login');
  }

  // Determine effective user id: prefer full session, otherwise try to map guest token to an existing user
  let effectiveUserId: string | undefined = session?.id;

  // helper to normalize phone numbers
  const normalizePhone = (p?: string | null) => {
    if (!p) return null;
    const digits = String(p).replace(/[^\d]/g, '');
    return digits || null;
  };

  if (!effectiveUserId && guestSessionToken) {
    try {
      const { jwtVerify } = await import('jose');
      const { payload } = await jwtVerify(guestSessionToken, new TextEncoder().encode(process.env.JWT_SECRET || ''), { algorithms: ['HS256'] });
      const rawPhone = (payload as any).phoneNumber || (payload as any).phone || (payload as any).phone_number;
      const normalized = normalizePhone(rawPhone);
      console.log('[COURSE PAGE] guest token phone:', { rawPhone, normalized });
      if (normalized) {
        // relaxed match
        let foundUser = await prisma.user.findFirst({ where: { phoneNumber: normalized } });
        if (!foundUser) {
          const containsVal = normalized.replace(/^\+/, '');
          foundUser = await prisma.user.findFirst({ where: { phoneNumber: { contains: containsVal } } });
        }
        if (foundUser) {
          effectiveUserId = foundUser.id;
          console.log('[COURSE PAGE] mapped guest phone to user:', effectiveUserId);
        }
      }
    } catch (err) {
      console.log('[COURSE PAGE] failed to decode guest token:', (err as Error).message);
    }
  }

  const { courseId } = params;
  const { course, completedModules, user, previousAttempts, resetRequest, isPurchased } = await getCourseData(courseId, effectiveUserId, isMiniApp);

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
            courseData={{ course, completedModules, user, previousAttempts, resetRequest, isPurchased } as any} 
        />
    </div>
  );
}
