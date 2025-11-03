
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { QuizEditor } from "./quiz-editor-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MoveLeft } from "lucide-react";

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
    
    return (
        <div className="space-y-8">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/quizzes">
                    <MoveLeft className="mr-2 h-4 w-4" />
                    Back to Quizzes
                </Link>
            </Button>
            <QuizEditor quiz={quiz} courseTitle={quiz.course?.title || 'Unknown'} />
        </div>
    );
}
