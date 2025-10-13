

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import prisma from "@/lib/db"
import { CourseClient } from "./course-client"

export default async function CourseManagementPage() {
  const courses = await prisma.course.findMany({
    orderBy: { title: 'asc' },
    include: {
      modules: true,
      product: true,
    }
  });
  
  const products = await prisma.product.findMany({
    orderBy: { name: 'asc' }
  });

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Course Management</h1>
          <p className="text-muted-foreground">
            Register new products, link training courses, and manage modules.
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Courses</CardTitle>
              <CardDescription>
                A list of all training courses in the system.
              </CardDescription>
            </div>
            <CourseClient courses={courses} products={products} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Associated Product</TableHead>
                  <TableHead className="text-center">Modules</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                        <CourseClient.Link course={course} />
                    </TableCell>
                    <TableCell>{course.product?.name}</TableCell>
                    <TableCell className="text-center">
                      {course.modules.length}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">Published</Badge>
                    </TableCell>
                    <TableCell>
                      <CourseClient.Actions course={course} products={products} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  )
}
