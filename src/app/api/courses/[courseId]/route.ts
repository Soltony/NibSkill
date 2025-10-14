
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { courseId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const includeQuiz = searchParams.get('quiz') === 'true';

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

    return NextResponse.json(course);
  } catch (error) {
    console.error('[COURSE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
