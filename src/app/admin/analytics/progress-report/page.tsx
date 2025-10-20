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

  const completions = await prisma.userCompletedCourse.findMany();
  const completionMap = new Map(completions.map(c => [`${c.userId}-${c.courseId}`, c.score]));

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
        const score = completionMap.get(`${user.id}-${course.id}`);
        return {
          userId: user.id,
          userName: user.name,
          department: user.department?.name || "N/A",
          district: user.district?.name || "N/A",
          branch: user.branch?.name || "N/A",
          courseId: course.id,
          courseTitle: course.title,
          score: score, // This will be the score number or undefined
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
