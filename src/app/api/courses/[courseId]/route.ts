
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const includeQuiz = searchParams.get('quiz') === 'true';
    const includeProgress = searchParams.get('progress') === 'true';

    const course = await prisma.course.findUnique({
      where: {
        id: params.courseId,
      },
      include: {
        modules: true,
        product: true,
        quiz: includeQuiz ? {
          include: {
            questions: {
              include: {
                options: true,
              },
            },
          },
        } : false,
      },
    });

    if (!course) {
      return new NextResponse('Course not found', { status: 404 });
    }
    
    if (includeProgress) {
        const completedModules = await prisma.userCompletedModule.findMany({
            where: {
                userId: session.id,
                moduleId: {
                    in: course.modules.map(m => m.id)
                }
            },
            select: {
                moduleId: true
            }
        });
        
        return NextResponse.json({ course, completedModules, user: session });
    }


    return NextResponse.json(course);
  } catch (error) {
    console.error('[COURSE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
