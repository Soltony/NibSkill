
import prisma from "@/lib/db"
import { ProgressReportClient } from "./progress-report-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { MoveLeft } from "lucide-react"

async function getProgressReportData(trainingProviderId: string | null | undefined, userRole: string) {
  const staffRoleWhere: any = { name: 'Staff' };
  if (userRole !== 'Super Admin') {
    staffRoleWhere.trainingProviderId = trainingProviderId;
  }
  const staffRole = await prisma.role.findFirst({
      where: staffRoleWhere,
      select: { id: true }
  });

  if (!staffRole) {
      return { reportData: [], courses: [], departments: [], districts: [], branches: [] };
  }

  const usersWhere: any = { roles: { some: { roleId: staffRole.id } } };
  if (userRole !== 'Super Admin') {
    usersWhere.trainingProviderId = trainingProviderId;
  }
  const users = await prisma.user.findMany({
    where: usersWhere,
    include: {
      department: true,
      district: true,
      branch: true,
    },
    orderBy: { name: "asc" },
  })

  const coursesWhere: any = {};
  if (userRole !== 'Super Admin') {
    coursesWhere.trainingProviderId = trainingProviderId;
  }
  const courses = await prisma.course.findMany({
    where: coursesWhere,
    include: {
      modules: true,
    },
    orderBy: { title: "asc" },
  })

  const completionsWhere: any = { user: { roles: { some: { roleId: staffRole.id } } } };
  if (userRole !== 'Super Admin') {
    completionsWhere.user = { trainingProviderId, roles: { some: { roleId: staffRole.id } } };
  }
  const completions = await prisma.userCompletedCourse.findMany({
    where: completionsWhere
  });
  const completionMap = new Map(completions.map(c => [`${c.userId}-${c.courseId}`, c.score]));

  const orgWhere: any = {};
  if (userRole !== 'Super Admin') {
    orgWhere.trainingProviderId = trainingProviderId;
  }
  const departments = await prisma.department.findMany({ where: orgWhere, orderBy: { name: "asc" } });
  const districts = await prisma.district.findMany({ where: orgWhere, orderBy: { name: "asc" } });

  const branchWhere: any = {};
  if (userRole !== 'Super Admin') {
    branchWhere.district = { trainingProviderId };
  }
  const branches = await prisma.branch.findMany({ where: branchWhere, orderBy: { name: "asc" } });

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
  if (!session?.id) {
    notFound();
  }

  const { reportData, courses, departments, districts, branches } = await getProgressReportData(session.trainingProviderId, session.role.name)
  
  return (
    <div className="space-y-8">
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/analytics">
            <MoveLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Link>
      </Button>
      <ProgressReportClient
          reportData={reportData}
          allCourses={courses}
          departments={departments}
          districts={districts}
          allBranches={branches}
      />
    </div>
  )
}
