
import { getSession } from "@/lib/auth"
import prisma from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { AddLearningPathForm } from "./add-learning-path-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MoveLeft } from "lucide-react";

async function getData(trainingProviderId: string) {
    const courses = await prisma.course.findMany({
        where: { 
            trainingProviderId,
            status: 'PUBLISHED'
        },
        orderBy: { title: "asc" }
    });
    return { courses };
}

export default async function AddLearningPathPage() {
    const session = await getSession();
    if (!session || !session.trainingProviderId) {
        notFound();
    }

    const { courses } = await getData(session.trainingProviderId);

    return (
        <div className="space-y-8">
            <div>
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/admin/learning-paths">
                        <MoveLeft className="mr-2 h-4 w-4" />
                        Back to Learning Paths
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Create New Learning Path</h1>
                <p className="text-muted-foreground">
                    Group existing courses into a structured learning sequence for your staff.
                </p>
            </div>
            <AddLearningPathForm courses={courses} />
        </div>
    )
}
