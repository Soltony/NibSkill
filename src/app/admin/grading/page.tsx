
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
import { Badge } from "@/components/ui/badge";
import { FeatureNotImplementedDialog } from "@/components/feature-not-implemented-dialog";

async function getPendingSubmissions() {
    const submissions = await prisma.quizSubmission.findMany({
        where: {
            status: 'PENDING_REVIEW'
        },
        include: {
            user: true,
            quiz: {
                include: {
                    course: true
                }
            }
        },
        orderBy: {
            submittedAt: 'asc'
        }
    });
    return submissions;
}


export default async function GradingPage() {
    const submissions = await getPendingSubmissions();

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
                                        <FeatureNotImplementedDialog
                                            title="Grade Submission"
                                            description="The grading interface is not yet implemented. This feature will allow you to review answers and assign a final score."
                                        >
                                            <Button variant="outline" size="sm">Grade</Button>
                                        </FeatureNotImplementedDialog>
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
