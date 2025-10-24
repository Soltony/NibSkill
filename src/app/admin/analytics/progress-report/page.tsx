
import prisma from "@/lib/db"
import { ProgressReportClient } from "./progress-report-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"

async function getProgressReportData(trainingProviderId: string) {
  const users = await prisma.user.findMany({
    where: { trainingProviderId },
    include: {
      department: true,
      district: true,
      branch: true,
    },
    orderBy: { name: "asc" },
  })

  const courses = await prisma.course.findMany({
    where: { trainingProviderId },
    include: {
      modules: true,
    },
    orderBy: { title: "asc" },
  })

  const completions = await prisma.userCompletedCourse.findMany({
    where: {
      user: {
        trainingProviderId
      }
    }
  });
  const completionMap = new Map(completions.map(c => [`${c.userId}-${c.courseId}`, c.score]));

  const departments = await prisma.department.findMany({
    where: { trainingProviderId },
    orderBy: { name: "asc" },
  })
  const districts = await prisma.district.findMany({
    where: { trainingProviderId },
    orderBy: { name: "asc" },
  })
  const branches = await prisma.branch.findMany({
    where: { district: { trainingProviderId } },
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
  const session = await getSession();
  if (!session || !session.trainingProviderId) {
    notFound();
  }

  const { reportData, courses, departments, districts, branches } = await getProgressReportData(session.trainingProviderId)
  
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
