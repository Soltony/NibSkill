

import prisma from "@/lib/db"
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
import { AddQuiz, ManageQuestions } from "./quiz-client"
import { getSession } from "@/lib/auth"
import { notFound } from "next/navigation"

async function getData(trainingProviderId: string | null | undefined, userRole: string) {
  const courseWhereClause = userRole === 'Super Admin' ? {} : { trainingProviderId };
  
  const courses = await prisma.course.findMany({
    where: courseWhereClause,
    orderBy: { title: "asc" }
  });

  const quizWhereClause: any = {};
  if (userRole !== 'Super Admin') {
    quizWhereClause.course = { trainingProviderId };
  }
  
  const quizzes = await prisma.quiz.findMany({
    where: quizWhereClause,
    include: {
      questions: {
        include: {
          options: true,
        },
      },
      course: true, // Include course to get the title
    },
    orderBy: { course: { title: "asc" } },
  });

  return { courses, quizzes };
}

export default async function QuizManagementPage() {
  const session = await getSession();
  if (!session?.id) {
    notFound();
  }

  const { courses, quizzes } = await getData(session.trainingProviderId, session.role.name);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Quiz Management</h1>
        <p className="text-muted-foreground">
          Create and manage quizzes for your training courses.
        </p>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Quizzes</CardTitle>
            <CardDescription>
              A list of all quizzes in the system.
            </CardDescription>
          </div>
          <AddQuiz courses={courses} quizzes={quizzes} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associated Course</TableHead>
                <TableHead className="text-center">Questions</TableHead>
                <TableHead className="text-center">Passing Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell className="font-medium">
                    {quiz.course?.title || "Unknown Course"}
                  </TableCell>
                  <TableCell className="text-center">
                    {quiz.questions.length}
                  </TableCell>
                  <TableCell className="text-center">
                    {quiz.passingScore}%
                  </TableCell>
                  <TableCell className="text-right">
                    <ManageQuestions quiz={quiz} courseTitle={quiz.course?.title || "Unknown"} />
                  </TableCell>
                </TableRow>
              ))}
              {quizzes.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No quizzes have been created yet.
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
