
import prisma from "@/lib/db";
import { notFound } from "next/navigation";
import { GradingClient } from "./grading-client";

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
        <GradingClient submission={submission} />
    );
}
