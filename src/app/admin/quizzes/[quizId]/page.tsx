
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { QuizEditor } from "./quiz-editor-client";

async function getQuizData(quizId: string) {
    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        include: {
            course: true,
            questions: {
                orderBy: { createdAt: 'asc' },
                include: {
                    options: {
                        orderBy: { createdAt: 'asc' },
                    },
                },
            },
        },
    });

    return quiz;
}


export default async function ManageQuizPage({ params }: { params: { quizId: string }}) {
    const quiz = await getQuizData(params.quizId);

    if (!quiz) {
        notFound();
    }
    
    return <QuizEditor quiz={quiz} courseTitle={quiz.course?.title || 'Unknown'} />;
}
