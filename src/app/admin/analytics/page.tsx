
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { AnalyticsDashboard } from "./analytics-dashboard"
import prisma from "@/lib/db"

async function getAnalyticsData(trainingProviderId: string) {
    const totalUsers = await prisma.user.count({
        where: { trainingProviderId },
    });

    const courses = await prisma.course.findMany({
        where: { trainingProviderId },
        include: { 
            completedBy: true,
            modules: true,
        },
    });

    const totalCourses = courses.length;
    const totalCompletions = courses.reduce((acc, course) => acc + course.completedBy.length, 0);
    const totalEnrollments = totalUsers * courses.length; // Simplified: assumes all users are enrolled in all courses
    const avgCompletionRate = totalEnrollments > 0 ? Math.round((totalCompletions / totalEnrollments) * 100) : 0;
    
    const allCompletions = await prisma.userCompletedCourse.findMany({
        where: { user: { trainingProviderId } },
    });
    const avgScore = allCompletions.length > 0 ? Math.round(allCompletions.reduce((acc, c) => acc + c.score, 0) / allCompletions.length) : 0;

    const leaderboard = await prisma.user.findMany({
        where: { trainingProviderId },
        include: {
            completedCourses: true,
            department: true,
        },
        orderBy: {
            completedCourses: {
                _count: 'desc'
            }
        },
        take: 5
    });

    const courseEngagement = courses.map(course => {
        const completionCount = course.completedBy.length;
        const completionRate = totalUsers > 0 ? Math.round((completionCount / totalUsers) * 100) : 0;
        return {
            id: course.id,
            title: course.title,
            completionRate
        };
    }).sort((a, b) => b.completionRate - a.completionRate);

    const scores = await prisma.userCompletedCourse.findMany({
        where: { user: { trainingProviderId } },
        select: { score: true }
    });
    const scoresDistribution = scores.reduce((acc, curr) => {
        if (curr.score <= 59) acc['0-59%']++;
        else if (curr.score <= 69) acc['60-69%']++;
        else if (curr.score <= 79) acc['70-79%']++;
        else if (curr.score <= 89) acc['80-89%']++;
        else acc['90-100%']++;
        return acc;
    }, { '0-59%': 0, '60-69%': 0, '70-79%': 0, '80-89%': 0, '90-100%': 0 });
    
    const completionByDept = await prisma.department.findMany({
        where: { trainingProviderId },
        include: {
            users: {
                include: {
                    completedCourses: true
                }
            }
        }
    });

    const deptCompletionRates = completionByDept.map(dept => {
        const deptUsers = dept.users;
        if (deptUsers.length === 0 || courses.length === 0) {
            return { department: dept.name, completionRate: 0 };
        }
        const totalPossibleCompletions = deptUsers.length * courses.length;
        const actualCompletions = deptUsers.reduce((sum, user) => sum + user.completedCourses.length, 0);
        return {
            department: dept.name,
            completionRate: totalPossibleCompletions > 0 ? Math.round((actualCompletions / totalPossibleCompletions) * 100) : 0,
        };
    });

    return {
        kpis: {
            totalUsers,
            totalCourses,
            avgCompletionRate,
            avgScore,
        },
        leaderboard: leaderboard.map(u => ({
            id: u.id,
            name: u.name,
            avatarUrl: u.avatarUrl,
            coursesCompleted: u.completedCourses.length,
            department: u.department?.name || 'N/A',
        })),
        courseEngagement: {
            mostCompleted: courseEngagement.slice(0, 3),
            leastCompleted: courseEngagement.slice(-3).reverse(),
        },
        scoresDistribution: Object.entries(scoresDistribution).map(([range, count]) => ({ range, count })),
        completionByDept: deptCompletionRates,
    }
}


export default async function AnalyticsPage() {
    const session = await getSession();
    if (!session?.trainingProviderId) {
        return notFound();
    }

    const analyticsData = await getAnalyticsData(session.trainingProviderId);

    return <AnalyticsDashboard analyticsData={analyticsData} />;
}
