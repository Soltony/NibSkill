
"use client"

import { useState, useEffect } from "react"
import {
  courses as initialCourses,
  quizzes as initialQuizzes,
  type Course,
  type Quiz,
} from "@/lib/data"
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
import { AddQuizDialog } from "@/components/add-quiz-dialog"
import { ManageQuestionsDialog } from "@/components/manage-questions-dialog"

const COURSES_STORAGE_KEY = "skillup-courses"
const QUIZZES_STORAGE_KEY = "skillup-quizzes"

export default function QuizManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY)
    setCourses(storedCourses ? JSON.parse(storedCourses) : initialCourses)

    const storedQuizzes = localStorage.getItem(QUIZZES_STORAGE_KEY)
    setQuizzes(storedQuizzes ? JSON.parse(storedQuizzes) : initialQuizzes)
    
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(QUIZZES_STORAGE_KEY, JSON.stringify(quizzes))
    }
  }, [quizzes, isLoaded])

  const handleQuizAdded = (newQuiz: Quiz) => {
    setQuizzes((prev) => [...prev, newQuiz])
  }
  
  const handleQuizUpdated = (updatedQuiz: Quiz) => {
    setQuizzes((prev) => prev.map(q => q.id === updatedQuiz.id ? updatedQuiz : q))
  }

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
          <AddQuizDialog courses={courses} onQuizAdded={handleQuizAdded} quizzes={quizzes}/>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Associated Course</TableHead>
                <TableHead className="text-center">Questions</TableHead>
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
                  <TableCell className="text-right">
                    <ManageQuestionsDialog
                      quiz={quiz}
                      courseTitle={getCourseTitle(quiz.courseId)}
                      onQuizUpdated={handleQuizUpdated}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {quizzes.length === 0 && (
                <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
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
