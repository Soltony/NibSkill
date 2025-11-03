
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { GradingClient } from "./grading-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MoveLeft } from "lucide-react";

async function getSubmissionData(submissionId: string) {
    const submission = await prisma.quizSubmission.findUnique({
        where: { id: submissionId },
        include: {
            user: true,
            quiz: {
                include: {
                    course: true,
                }
            },
            answers: {
                include: {
                    question: {
                        include: {
                            options: true
                        }
                    }
                }
            }
        }
    });

    return submission;
}

export default async function GradingSubmissionPage({ params }: { params: { submissionId: string } }) {
    const submission = await getSubmissionData(params.submissionId);

    if (!submission) {
        notFound();
    }

    return (
        <div className="space-y-8">
            <Button asChild variant="outline" size="sm">
                <Link href="/admin/grading">
                    <MoveLeft className="mr-2 h-4 w-4" />
                    Back to Grading List
                </Link>
            </Button>
            <GradingClient submission={submission} />
        </div>
    );
}
