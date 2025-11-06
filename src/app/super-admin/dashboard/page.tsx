
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import prisma from "@/lib/db"
import { BookCopy, Building, Radio, Users } from "lucide-react"

async function getSuperAdminData() {
    const totalProviders = await prisma.trainingProvider.count();
    
    const staffRoles = await prisma.role.findMany({
      where: { name: 'Staff' },
      select: { id: true }
    });
    const staffRoleIds = staffRoles.map(r => r.id);

    const totalTrainees = await prisma.user.count({
        where: { roleId: { in: staffRoleIds } }
    });

    const totalCourses = await prisma.course.count();
    const activeLiveSessions = await prisma.liveSession.count({
        where: { status: 'LIVE' }
    });

    return {
        totalProviders,
        totalTrainees,
        totalCourses,
        activeLiveSessions,
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

        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>New Registrations</CardTitle>
                    <CardDescription>Chart showing new trainee registrations over the last 30 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
                        Chart coming soon...
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Provider Activity</CardTitle>
                    <CardDescription>Chart showing course creation activity by provider.</CardDescription>
                </CardHeader>
                <CardContent>
                     <div className="h-60 flex items-center justify-center text-muted-foreground text-sm">
                        Chart coming soon...
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
  )
}
