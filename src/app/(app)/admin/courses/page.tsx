
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { courses as initialCourses, products as initialProducts, type Product } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MoreHorizontal } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AddCourseDialog } from "@/components/add-course-dialog"
import type { Course } from "@/lib/data"
import { EditCourseDialog } from "@/components/edit-course-dialog"
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
import { useToast } from "@/hooks/use-toast"

const PRODUCTS_STORAGE_KEY = "skillup-products";
const COURSES_STORAGE_KEY = "skillup-courses";

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [products, setProducts] = useState<Product[]>([]);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();


  useEffect(() => {
    const storedProducts = localStorage.getItem(PRODUCTS_STORAGE_KEY)
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts))
    } else {
      setProducts(initialProducts)
    }

    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY)
    if (storedCourses) {
      setCourses(JSON.parse(storedCourses))
    } else {
      setCourses(initialCourses)
    }
    setIsLoaded(true);
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(COURSES_STORAGE_KEY, JSON.stringify(courses))
    }
  }, [courses, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products))
    }
  }, [products, isLoaded])


  const handleCourseAdded = (newCourse: Course) => {
    setCourses((prevCourses) => [newCourse, ...prevCourses])
  }

  const handleCourseUpdated = (updatedCourse: Course) => {
    setCourses((prevCourses) =>
      prevCourses.map((c) => (c.id === updatedCourse.id ? updatedCourse : c))
    )
  }

  const handleConfirmDelete = () => {
    if (courseToDelete) {
      setCourses((prevCourses) => prevCourses.filter((c) => c.id !== courseToDelete.id));
      toast({
        title: "Course Deleted",
        description: `The course "${courseToDelete.title}" has been deleted.`,
      });
      setCourseToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Course Management</h1>
          <p className="text-muted-foreground">
            Register new products, link training courses, and manage modules.
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Courses</CardTitle>
              <CardDescription>
                A list of all training courses in the system.
              </CardDescription>
            </div>
            <AddCourseDialog onCourseAdded={handleCourseAdded} products={products} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Title</TableHead>
                  <TableHead>Associated Product</TableHead>
                  <TableHead className="text-center">Modules</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">
                        <Link href={`/admin/courses/${course.id}`} className="hover:underline">
                            {course.title}
                        </Link>
                    </TableCell>
                    <TableCell>{course.productName}</TableCell>
                    <TableCell className="text-center">
                      {course.modules.length}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">Published</Badge>
                    </TableCell>
                    <TableCell>
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
                           <EditCourseDialog course={course} products={products} onCourseUpdated={handleCourseUpdated}>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
