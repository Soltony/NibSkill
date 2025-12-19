
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import prisma from "@/lib/db"
import { BookCopy, Building, Radio, Users } from "lucide-react"
import { SuperAdminCharts } from "./super-admin-charts"
import { subDays, format } from "date-fns";


async function getSuperAdminData() {
    const totalProviders = await prisma.trainingProvider.count();
    
    const staffRoles = await prisma.role.findMany({
      where: { name: 'Staff' },
      select: { id: true }
    });
    const staffRoleIds = staffRoles.map(r => r.id);

    const totalTrainees = await prisma.user.count({
        where: {
            roles: {
                some: {
                    roleId: {
                        in: staffRoleIds
                    }
                }
            }
        }
    });

    const totalCourses = await prisma.course.count();
    const activeLiveSessions = await prisma.liveSession.count({
        where: { status: 'LIVE' }
    });
    
    // Data for New Registrations chart
    const thirtyDaysAgo = subDays(new Date(), 30);
    const newRegistrations = await prisma.user.groupBy({
        by: ['createdAt'],
        where: {
            roles: {
                some: {
                    roleId: {
                        in: staffRoleIds
                    }
                }
            },
            createdAt: {
                gte: thirtyDaysAgo
            }
        },
        _count: {
            id: true
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    // Process data for the chart
    const dailyRegistrations = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
        const date = subDays(new Date(), i);
        dailyRegistrations.set(format(date, 'yyyy-MM-dd'), 0);
    }
    
    newRegistrations.forEach(reg => {
        const dateStr = format(reg.createdAt, 'yyyy-MM-dd');
        if (dailyRegistrations.has(dateStr)) {
            dailyRegistrations.set(dateStr, (dailyRegistrations.get(dateStr) || 0) + reg._count.id);
        }
    });
    
    const registrationChartData = Array.from(dailyRegistrations.entries()).map(([date, count]) => ({
        date: format(new Date(date), 'MMM dd'),
        registrations: count
    })).reverse();


    // Data for Provider Activity chart
    const providerActivity = await prisma.trainingProvider.findMany({
        select: {
            name: true,
            _count: {
                select: { courses: true }
            }
        }
    });

    const providerActivityChartData = providerActivity.map(p => ({
        provider: p.name,
        courses: p._count.courses,
    }));


    return {
        totalProviders,
        totalTrainees,
        totalCourses,
        activeLiveSessions,
        registrationChartData,
        providerActivityChartData,
    }
}


export default async function SuperAdminDashboard() {
  const stats = await getSuperAdminData();

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            A high-level overview of all system-wide activity.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.totalProviders}</div>
                <p className="text-xs text-muted-foreground">Training organizations on the platform.</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trainees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.totalTrainees}</div>
                <p className="text-xs text-muted-foreground">Staff members across all providers.</p>
            </CardContent>
            </Card>
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                <BookCopy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.totalCourses}</div>
                <p className="text-xs text-muted-foreground">Courses available in the system.</p>
            </CardContent>
            </Card>
             <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Live Sessions</CardTitle>
                <Radio className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{stats.activeLiveSessions}</div>
                <p className="text-xs text-muted-foreground">Sessions currently in progress.</p>
            </CardContent>
            </Card>
        </div>

        <SuperAdminCharts
            registrationData={stats.registrationChartData}
            providerActivityData={stats.providerActivityChartData}
        />
      </div>
  )
}
