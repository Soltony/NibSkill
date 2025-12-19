
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { AnalyticsDashboard } from "./analytics-dashboard"
import prisma from "@/lib/db"

async function getAnalyticsData(trainingProviderId: string | null | undefined, userRole: string) {
    const usersWhere: any = {
        roles: { some: { role: { name: 'Staff' } } }
    };
    if (userRole !== 'Super Admin') {
        usersWhere.trainingProviderId = trainingProviderId;
    }

    const totalUsers = await prisma.user.count({
        where: usersWhere,
    });

    const coursesWhere: any = { status: 'PUBLISHED' };
    if (userRole !== 'Super Admin') {
        coursesWhere.trainingProviderId = trainingProviderId;
    }

    const courses = await prisma.course.findMany({
        where: coursesWhere,
        include: {
            completedBy: {
                where: { user: usersWhere }
            },
            modules: true,
        },
    });

    const totalCourses = courses.length;
    const totalCompletions = courses.reduce((acc, course) => acc + course.completedBy.length, 0);
    const totalPossibleEnrollments = totalUsers > 0 ? totalUsers * totalCourses : 0;
    const avgCompletionRate = totalPossibleEnrollments > 0 ? Math.round((totalCompletions / totalPossibleEnrollments) * 100) : 0;

    const allCompletions = await prisma.userCompletedCourse.findMany({ 
        where: { user: usersWhere } 
    });
    
    const avgScore = allCompletions.length > 0 ? Math.round(allCompletions.reduce((acc, c) => acc + c.score, 0) / allCompletions.length) : 0;

    const leaderboard = await prisma.user.findMany({
        where: usersWhere,
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
        where: { user: usersWhere },
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
    
    const deptWhere: any = {};
    if (userRole !== 'Super Admin') {
        deptWhere.trainingProviderId = trainingProviderId;
    }
    const completionByDept = await prisma.department.findMany({
        where: deptWhere,
        include: {
            users: {
                where: { roles: { some: { role: { name: 'Staff' } } } },
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
    if (!session?.id) {
        return notFound();
    }

    const analyticsData = await getAnalyticsData(session.trainingProviderId, session.role.name);

    return <AnalyticsDashboard analyticsData={analyticsData} />;
}
