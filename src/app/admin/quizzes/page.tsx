
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
import { QuizClient } from "./quiz-client"

export default async function QuizManagementPage() {
  const courses = await prisma.course.findMany({ orderBy: { title: "asc" } });
  const quizzes = await prisma.quiz.findMany({
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
    orderBy: { course: { title: "asc" } },
  });
  
  const { AddQuiz, ManageQuestions } = QuizClient({ courses, quizzes });
  
  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || "Unknown Course"
  }

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
          <AddQuiz />
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
                    {getCourseTitle(quiz.courseId)}
                  </TableCell>
                  <TableCell className="text-center">
                    {quiz.questions.length}
                  </TableCell>
                  <TableCell className="text-center">
                    {quiz.passingScore}%
                  </TableCell>
                  <TableCell className="text-right">
                    <ManageQuestions quiz={quiz} />
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
