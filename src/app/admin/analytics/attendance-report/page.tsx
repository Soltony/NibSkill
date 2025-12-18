
import prisma from "@/lib/db"
import { AttendanceReportClient } from "./attendance-report-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MoveLeft } from "lucide-react"

async function getAttendanceReportData(trainingProviderId: string | null | undefined, userRole: string) {
  const staffRoleWhere: any = { name: 'Staff' };
  if (userRole !== 'Super Admin') {
    staffRoleWhere.trainingProviderId = trainingProviderId;
  }
  const staffRole = await prisma.role.findFirst({ where: staffRoleWhere, select: { id: true } });

  if (!staffRole) {
      return { sessions: [], users: [], departments: [], districts: [], branches: [] };
  }
  
  const sessionsWhere: any = {};
  if (userRole !== 'Super Admin') {
    sessionsWhere.trainingProviderId = trainingProviderId;
  }
  const sessions = await prisma.liveSession.findMany({
    where: sessionsWhere,
    include: {
      attendedBy: {
        where: { user: { roleId: staffRole.id } },
        include: {
          user: {
            include: {
              department: true,
              district: true,
              branch: true,
            }
          }
        },
        orderBy: {
            attendedAt: 'desc'
        }
      }
    },
    orderBy: { dateTime: "desc" },
  });

  const usersWhere: any = { roleId: staffRole.id };
  if (userRole !== 'Super Admin') {
    usersWhere.trainingProviderId = trainingProviderId;
  }
  const users = await prisma.user.findMany({ where: usersWhere, orderBy: { name: 'asc' } });
  
  const orgWhere: any = {};
  if (userRole !== 'Super Admin') {
    orgWhere.trainingProviderId = trainingProviderId;
  }
  const departments = await prisma.department.findMany({ where: orgWhere, orderBy: { name: 'asc' } });
  const districts = await prisma.district.findMany({ where: orgWhere, orderBy: { name: 'asc' } });
  
  const branchWhere: any = {};
  if (userRole !== 'Super Admin') {
    branchWhere.district = { trainingProviderId };
  }
  const branches = await prisma.branch.findMany({ where: branchWhere, orderBy: { name: 'asc' } });

  return { 
    sessions,
    users,
    departments,
    districts,
    branches
  }
}

export default async function AttendanceReportPage() {
  const session = await getSession();
  if (!session?.id) {
    notFound();
  }

  const { sessions, users, departments, districts, branches } = await getAttendanceReportData(session.trainingProviderId, session.role.name)
  
  return (
    <div className="space-y-8">
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/analytics">
            <MoveLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Link>
      </Button>
      <AttendanceReportClient
          sessions={sessions as any}
          users={users}
          departments={departments}
          districts={districts}
          branches={branches}
      />
    </div>
  )
}
