
import { getSession } from "@/lib/auth"
import prisma from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { EditLearningPathForm } from "./edit-learning-path-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MoveLeft } from "lucide-react";

async function getData(trainingProviderId: string, pathId: string) {
    const allPublishedCourses = await prisma.course.findMany({
        where: { 
            trainingProviderId,
            status: 'PUBLISHED'
        },
        orderBy: { title: "asc" }
    });

    const learningPath = await prisma.learningPath.findUnique({
        where: { id: pathId, trainingProviderId },
        include: {
            courses: {
                orderBy: {
                    order: 'asc'
                },
                include: {
                    course: true // Include full course object
                }
            }
        }
    });

    if (!learningPath) {
        notFound();
    }
    
    return { allPublishedCourses, learningPath };
}

export default async function EditLearningPathPage({ params }: { params: { pathId: string } }) {
    const session = await getSession();
    if (!session || !session.trainingProviderId) {
        notFound();
    }

    const { allPublishedCourses, learningPath } = await getData(session.trainingProviderId, params.pathId);

    return (
        <div className="space-y-8">
            <div>
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href="/admin/learning-paths">
                        <MoveLeft className="mr-2 h-4 w-4" />
                        Back to Learning Paths
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Edit Learning Path</h1>
                <p className="text-muted-foreground">
                    Update the details for "{learningPath.title}".
                </p>
            </div>
            <EditLearningPathForm allPublishedCourses={allPublishedCourses} learningPath={learningPath as any} />
        </div>
    )
}
