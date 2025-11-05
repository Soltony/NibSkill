

import Image from "next/image"
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
import { CourseClient, CourseLink, CourseActions } from "../course-client"
import { cn } from "@/lib/utils"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { CourseStatus } from "@prisma/client"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

async function getData(trainingProviderId: string) {
  const courses = await prisma.course.findMany({
    where: { 
      trainingProviderId,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      modules: true,
      product: true,
    }
  });
  
  const products = await prisma.product.findMany({
    where: { trainingProviderId },
    orderBy: { name: 'asc' }
  });

  return { courses, products }
}

export default async function CourseManagementPage() {
  const session = await getSession();
  if (!session || !session.trainingProviderId) {
    notFound();
  }

  const { courses, products } = await getData(session.trainingProviderId);

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
                A list of all training courses in the system, including pending and published.
              </CardDescription>
            </div>
            <CourseClient courses={courses} products={products} />
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
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
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
                        <CourseLink course={course} />
                    </TableCell>
                    <TableCell>{course.product?.name}</TableCell>
                    <TableCell className="text-center">
                      {course.modules.length}
                    </TableCell>
                    <TableCell className="text-center">
                       {course.status === 'REJECTED' && course.rejectionReason ? (
                         <TooltipProvider>
                           <Tooltip>
                             <TooltipTrigger>
                               <Badge 
                                variant="destructive"
                                className="cursor-help"
                               >
                                 REJECTED
                               </Badge>
                             </TooltipTrigger>
                             <TooltipContent>
                               <p>{course.rejectionReason}</p>
                             </TooltipContent>
                           </Tooltip>
                         </TooltipProvider>
                       ) : (
                        <Badge 
                          variant={course.status === 'PUBLISHED' ? 'secondary' : 'outline'}
                          className={cn(
                            course.status === 'PUBLISHED' && 'text-green-600 border-green-600',
                            course.status === 'PENDING' && 'text-amber-600 border-amber-600',
                          )}
                        >
                          {course.status}
                        </Badge>
                       )}
                    </TableCell>
                    <TableCell>
                      <CourseActions course={course} products={products} />
                    </TableCell>
                  </TableRow>
                ))}
                {courses.length === 0 && (
                   <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                           No courses have been created yet.
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
