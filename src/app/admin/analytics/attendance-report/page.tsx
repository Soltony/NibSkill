
import prisma from "@/lib/db"
import { AttendanceReportClient } from "./attendance-report-client"

async function getAttendanceReportData() {
  const sessions = await prisma.liveSession.findMany({
    include: {
      attendees: {
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

  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }});
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }});
  const districts = await prisma.district.findMany({ orderBy: { name: 'asc' }});
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' }});

  return { 
    sessions,
    users,
    departments,
    districts,
    branches
  }
}

export default async function AttendanceReportPage() {
  const { sessions, users, departments, districts, branches } = await getAttendanceReportData()
  
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

