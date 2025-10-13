
"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { AddLearningPathDialog } from "@/components/add-learning-path-dialog"
import { EditLearningPathDialog } from "@/components/edit-learning-path-dialog"
import { useToast } from "@/hooks/use-toast"
import { deleteLearningPath } from "@/app/actions/learning-path-actions"
import type { LearningPath, Course } from "@prisma/client"

type LearningPathWithCourses = LearningPath & { courses: { course: Course }[] };

type LearningPathClientProps = {
  paths: LearningPathWithCourses[];
  courses: Course[];
}

export function LearningPathClient({ paths, courses }: LearningPathClientProps) {
  return (
    <AddLearningPathDialog courses={courses} />
  )
}

function LearningPathActions({ path, courses }: { path: LearningPathWithCourses, courses: Course[]}) {
    const [pathToDelete, setPathToDelete] = useState<LearningPath | null>(null);
    const { toast } = useToast();

    const handleConfirmDelete = async () => {
        if (pathToDelete) {
            const result = await deleteLearningPath(pathToDelete.id);
            if (result.success) {
                toast({
                    title: "Learning Path Deleted",
                    description: `The path "${pathToDelete.title}" has been deleted.`,
                });
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive"
                });
            }
            setPathToDelete(null);
        }
    };
    
    return (
        <>
            <div className="flex justify-end gap-2">
                <EditLearningPathDialog
                  learningPath={path}
                  courses={courses}
                />
                 <Button variant="destructive-outline" size="sm" onClick={() => setPathToDelete(path)}>Delete</Button>
            </div>
        
            <AlertDialog open={!!pathToDelete} onOpenChange={(open) => !open && setPathToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the
                        learning path <span className="font-semibold">"{pathToDelete?.title}"</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
      </>
    )
}

LearningPathClient.Actions = LearningPathActions;

    