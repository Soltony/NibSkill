

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
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import Image from "next/image"
import { ApprovalActions } from "./approval-client"
import Link from "next/link"

async function getPendingCourses(trainingProviderId: string | null | undefined, userRole: string) {
  const whereClause: any = { status: 'PENDING' };
  if (userRole !== 'Super Admin') {
    whereClause.trainingProviderId = trainingProviderId;
  }

  const courses = await prisma.course.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    include: {
      modules: true,
      product: true,
    }
  });
  return courses;
}


export default async function CourseApprovalPage() {
  const session = await getSession();
  if (!session?.id) {
    notFound();
  }

  const courses = await getPendingCourses(session.trainingProviderId, session.role.name);

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Course Approvals</h1>
          <p className="text-muted-foreground">
            Review and approve newly created courses before they are published.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Pending Courses</CardTitle>
            <CardDescription>
              The following courses are awaiting your approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                  </TableHead>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Associated Product</TableHead>
                  <TableHead className="text-center">Modules</TableHead>
                  <TableHead className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                     <TableCell className="hidden sm:table-cell">
                      {course.product?.imageUrl ? (
                        <Image
                          alt={course.product.name}
                          className="aspect-square rounded-md object-cover"
                          height="64"
                          src={course.product.imageUrl}
                          width="64"
                          data-ai-hint={course.product.imageHint ?? undefined}
                        />
                      ) : (
                        <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center text-xs text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {course.title}
                    </TableCell>
                    <TableCell>{course.product?.name}</TableCell>
                    <TableCell className="text-center">
                      {course.modules.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <ApprovalActions course={course} />
                    </TableCell>
                  </TableRow>
                ))}
                 {courses.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            There are no courses pending approval.
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
