
"use client"

import type { Course, Quiz, Question, Option as OptionType } from "@prisma/client"
import { AddQuizDialog } from "@/components/add-quiz-dialog"
import { ManageQuestionsDialog } from "@/components/manage-questions-dialog"

type QuizWithRelations = Quiz & {
  questions: (Question & { options: OptionType[] })[]
}

type QuizClientProps = {
  courses: Course[]
  quizzes: QuizWithRelations[]
}

export function QuizClient({ courses, quizzes }: QuizClientProps) {
  const getCourseTitle = (courseId: string) => {
    return courses.find(c => c.id === courseId)?.title || "Unknown Course"
  }

  return {
    AddQuiz: () => <AddQuizDialog courses={courses} quizzes={quizzes} />,
    ManageQuestions: ({ quiz }: { quiz: QuizWithRelations }) => (
      <ManageQuestionsDialog
        quiz={quiz}
        courseTitle={getCourseTitle(quiz.courseId)}
      />
    ),
  }
}
