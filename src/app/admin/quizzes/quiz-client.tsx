
"use client"

import type { Course, Quiz, Question, Option as OptionType } from "@prisma/client"
import { AddQuizDialog } from "@/components/add-quiz-dialog"
import Link from "next/link"
import { Button } from "@/components/ui/button"

type QuizWithRelations = Quiz & {
  questions: (Question & { options: OptionType[] })[]
}

type AddQuizProps = {
  courses: Course[]
  quizzes: Quiz[]
}

export function AddQuiz({ courses, quizzes }: AddQuizProps) {
  return <AddQuizDialog courses={courses} quizzes={quizzes} />
}

type ManageQuestionsProps = {
  quiz: QuizWithRelations
  courseTitle: string
}

export function ManageQuestions({ quiz, courseTitle }: ManageQuestionsProps) {
  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/admin/quizzes/${quiz.id}`}>
        Manage
      </Link>
    </Button>
  )
}
