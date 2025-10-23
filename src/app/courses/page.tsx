
import { CourseCard } from '@/components/course-card';
import prisma from '@/lib/db';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

async function getCoursesData(userId: string) {
    const courses = await prisma.course.findMany({
        include: { modules: true, product: true }
    });

    const userCompletions = await prisma.userCompletedCourse.findMany({
        where: { userId: userId },
        select: { courseId: true, score: true }
    });

    const userModuleCompletions = await prisma.userCompletedModule.findMany({
        where: { userId: userId },
        select: { moduleId: true }
    });

    const completedModulesByCourse = userModuleCompletions.reduce((acc, completion) => {
        const module = courses.flatMap(c => c.modules).find(m => m.id === completion.moduleId);
        if (module) {
            if (!acc[module.courseId]) {
                acc[module.courseId] = new Set();
            }
            acc[module.courseId].add(module.id);
        }
        return acc;
    }, {} as Record<string, Set<string>>);

    const completionsMap = new Map(userCompletions.map(c => [c.courseId, c.score]));

    const coursesWithProgress = courses.map(course => {
        if (completionsMap.has(course.id)) {
            return { ...course, progress: 100 };
        }
        const completedModuleCount = completedModulesByCourse[course.id]?.size || 0;
        const progress = course.modules.length > 0 ? Math.round((completedModuleCount / course.modules.length) * 100) : 0;
        return { ...course, progress };
    });

    return coursesWithProgress;
}

export default async function CoursesPage() {
    const session = await getSession();
    if (!session) {
        redirect('/login');
    }

    const courses = await getCoursesData(session.id);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">All Courses</h1>
                <p className="text-muted-foreground">
                    Browse all available courses and continue your learning journey.
                </p>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {courses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                ))}
            </div>
        </div>
    );
}
