

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import prisma from "@/lib/db"
import { AddProviderDialog } from "./add-provider-dialog"
import type { TrainingProvider, User } from "@prisma/client"
import { EditProviderDialog } from "./edit-provider-dialog"
import { BookCopy, Building, Radio, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { DeleteProviderButton } from "./delete-provider-button"

type ProviderWithAdmin = TrainingProvider & { users: User[] };
export const dynamic = "force-dynamic";

async function getSuperAdminData() {
    const providers: ProviderWithAdmin[] = await prisma.trainingProvider.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            users: {
                where: { role: { name: 'Training Provider' } },
                take: 1,
            }
        }
    });

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
        providers,
        stats: {
            totalProviders,
            totalTrainees,
            totalCourses,
            activeLiveSessions,
        }
    }
}


export default async function SuperAdminDashboard() {
  const { providers, stats } = await getSuperAdminData();

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Oversee all training providers and system-wide activity.
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Training Providers</CardTitle>
              <CardDescription>
                A list of all registered training providers.
              </CardDescription>
            </div>
            <AddProviderDialog />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Admin Name</TableHead>
                  <TableHead>Admin Email</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const admin = provider.users[0];
                  return (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">
                          {provider.name}
                      </TableCell>
                      <TableCell>{admin?.name || 'N/A'}</TableCell>
                      <TableCell>{admin?.email || 'N/A'}</TableCell>
                      <TableCell>{provider.accountNumber}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <EditProviderDialog provider={provider} admin={admin} />
                            <DeleteProviderButton provider={provider} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                 {providers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No training providers registered yet.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  )
}
