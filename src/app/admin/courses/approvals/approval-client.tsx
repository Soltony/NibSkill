
"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { publishCourse } from "@/app/actions/course-actions"
import type { Course as CourseType } from "@prisma/client"
import Link from "next/link"

export function ApprovalActions({ course }: { course: CourseType }) {
    const { toast } = useToast();
    
    const handlePublish = async () => {
        const result = await publishCourse(course.id);
        if (result.success) {
            toast({
                title: "Course Published",
                description: `The course "${course.title}" is now live.`,
            });
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive"
            });
        }
    }

    return (
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
            <Link href={`/admin/courses/${course.id}?from=approvals`}>Review</Link>
        </Button>
        <Button onClick={handlePublish} size="sm">Approve</Button>
      </div>
    )
}
