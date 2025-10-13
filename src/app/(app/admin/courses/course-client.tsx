
"use client"

import { useState } from "react"
import Link from "next/link"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { AddCourseDialog } from "@/components/add-course-dialog"
import { EditCourseDialog } from "@/components/edit-course-dialog"
import { useToast } from "@/hooks/use-toast"
import { deleteCourse } from "@/app/actions/course-actions"
import type { Course as CourseType, Product as ProductType, Module } from "@prisma/client"

type CourseWithRelations = CourseType & {
    modules: Module[];
    product: ProductType | null;
}

type CourseClientProps = {
  courses: CourseWithRelations[]
  products: ProductType[]
}

export function CourseClient({ courses, products }: CourseClientProps) {
  return (
    <AddCourseDialog products={products} />
  )
}

function CourseLink({ course }: { course: CourseWithRelations }) {
    return (
        <Link href={`/admin/courses/${course.id}`} className="hover:underline">
            {course.title}
        </Link>
    )
}
CourseClient.Link = CourseLink


function CourseActions({ course, products }: { course: CourseWithRelations, products: ProductType[]}) {
    const [courseToDelete, setCourseToDelete] = useState<CourseWithRelations | null>(null);
    const { toast } = useToast();

    const handleConfirmDelete = async () => {
        if (courseToDelete) {
            const result = await deleteCourse(courseToDelete.id);
            if (result.success) {
                toast({
                    title: "Course Deleted",
                    description: `The course "${courseToDelete.title}" has been deleted.`,
                });
            } else {
                toast({
                    title: "Error",
                    description: result.message,
                    variant: "destructive"
                });
            }
            setCourseToDelete(null);
        }
    };
    
    return (
        <>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button
                aria-haspopup="true"
                size="icon"
                variant="ghost"
            >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Toggle menu</span>
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <EditCourseDialog course={course} products={products}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    Edit
                </DropdownMenuItem>
            </EditCourseDialog>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCourseToDelete(course)} className="text-destructive">
                Delete
            </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
        
        <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    course <span className="font-semibold">"{courseToDelete?.title}"</span>.
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

CourseClient.Actions = CourseActions;
