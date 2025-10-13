
import prisma from "@/lib/db"
import { ProgressReportClient } from "./progress-report-client"

async function getProgressReportData() {
  const users = await prisma.user.findMany({
    include: {
      department: true,
      district: true,
      branch: true,
    },
    orderBy: { name: "asc" },
  })

  const courses = await prisma.course.findMany({
    include: {
      modules: true,
    },
    orderBy: { title: "asc" },
  })

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  })
  const districts = await prisma.district.findMany({
    orderBy: { name: "asc" },
  })
  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
  })

  const reportData = users
    .map((user) => {
      return courses.map((course) => {
        // In a real app, progress would be calculated based on user's completion records.
        // For this prototype, we'll continue to use a deterministic mock value.
        const progress = (user.name.length + course.title.length) % 81

        return {
          userId: user.id,
          userName: user.name,
          department: user.department?.name || "N/A",
          district: user.district?.name || "N/A",
          branch: user.branch?.name || "N/A",
          courseId: course.id,
          courseTitle: course.title,
          progress,
        }
      })
    })
    .flat()

  return {
    reportData,
    courses,
    departments,
    districts,
    branches,
  }
}

export default async function ProgressReportPage() {
  const { reportData, courses, departments, districts, branches } = await getProgressReportData()
  
  return (
    <ProgressReportClient
        reportData={reportData}
        allCourses={courses}
        departments={departments}
        districts={districts}
        allBranches={branches}
    />
  )
}
