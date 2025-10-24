
import prisma from "@/lib/db"
import { AttendanceReportClient } from "./attendance-report-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"

async function getAttendanceReportData(trainingProviderId: string) {
  const sessions = await prisma.liveSession.findMany({
    where: { trainingProviderId },
    include: {
      attendedBy: {
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

  const users = await prisma.user.findMany({ 
    where: { trainingProviderId },
    orderBy: { name: 'asc' }
  });
  const departments = await prisma.department.findMany({ 
    where: { trainingProviderId },
    orderBy: { name: 'asc' }
  });
  const districts = await prisma.district.findMany({ 
    where: { trainingProviderId },
    orderBy: { name: 'asc' }
  });
  const branches = await prisma.branch.findMany({ 
    where: { district: { trainingProviderId } },
    orderBy: { name: 'asc' }
  });

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
  if (!session || !session.trainingProviderId) {
    notFound();
  }

  const { sessions, users, departments, districts, branches } = await getAttendanceReportData(session.trainingProviderId)
  
  return (
    <AttendanceReportClient
        sessions={sessions}
        users={users}
        departments={departments}
        districts={districts}
        branches={branches}
    />
  )
}
