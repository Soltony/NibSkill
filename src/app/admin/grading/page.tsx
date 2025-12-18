
import prisma from "@/lib/db";
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
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getPendingSubmissions(trainingProviderId: string | null | undefined, userRole: string) {
  const whereClause: any = { status: 'PENDING_REVIEW' };
  if (userRole !== 'Super Admin') {
    whereClause.quiz = { course: { trainingProviderId } };
  }

  const submissions = await prisma.quizSubmission.findMany({
    where: whereClause,
    include: {
      user: true,
      quiz: {
        include: {
          course: true,
        },
      },
    },
    orderBy: {
      submittedAt: 'asc',
    },
  });
  return submissions;
}


export default async function GradingPage() {
    const session = await getSession();
    if (!session?.id) {
        notFound();
    }

    const submissions = await getPendingSubmissions(session.trainingProviderId, session.role.name);

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Manual Grading</h1>
                <p className="text-muted-foreground">
                    Review and grade quiz submissions that require manual input.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Pending Submissions</CardTitle>
                    <CardDescription>
                        The following quiz submissions are waiting for your review.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Course</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Submitted At</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {submissions.map((submission) => (
                                <TableRow key={submission.id}>
                                    <TableCell className="font-medium">{submission.quiz.course.title}</TableCell>
                                    <TableCell>{submission.user.name}</TableCell>
                                    <TableCell>{new Date(submission.submittedAt).toLocaleString()}</TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/admin/grading/${submission.id}`}>Grade</Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                             {submissions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No submissions are currently pending review.
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
