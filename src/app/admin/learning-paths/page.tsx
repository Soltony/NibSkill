
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
import { LearningPathActions } from "./learning-path-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusCircle } from "lucide-react"

async function getData(trainingProviderId: string) {
  const learningPaths = await prisma.learningPath.findMany({
    where: { trainingProviderId },
    orderBy: { title: "asc" },
    include: {
      courses: {
        include: {
          course: true
        }
      }
    },
  })
  
  const courses = await prisma.course.findMany({
    where: { trainingProviderId },
    orderBy: { title: "asc" }
  })
  
  return { learningPaths, courses }
}

export default async function LearningPathManagementPage() {
  const session = await getSession();
  if (!session || !session.trainingProviderId) {
    notFound();
  }
  
  const { learningPaths, courses } = await getData(session.trainingProviderId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Learning Paths</h1>
        <p className="text-muted-foreground">
          Group courses into guided learning sequences for your staff.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Learning Paths</CardTitle>
            <CardDescription>
              A list of all learning paths in the system.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/admin/learning-paths/add">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Path
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Path Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Courses</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {learningPaths.map((path) => (
                <TableRow key={path.id}>
                  <TableCell className="font-medium">{path.title}</TableCell>
                  <TableCell>{path.description}</TableCell>
                  <TableCell className="text-center">
                    {path.courses.length}
                  </TableCell>
                  <TableCell className="text-right">
                    <LearningPathActions path={path} courses={courses} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {learningPaths.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No learning paths have been created yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
