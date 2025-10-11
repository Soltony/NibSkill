
"use client"

import { useState, useEffect } from "react"
import {
  courses as initialCourses,
  learningPaths as initialLearningPaths,
  type Course,
  type LearningPath,
} from "@/lib/data"
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
import { AddLearningPathDialog } from "@/components/add-learning-path-dialog"
import { EditLearningPathDialog } from "@/components/edit-learning-path-dialog"
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
import { Button } from "@/components/ui/button"

const COURSES_STORAGE_KEY = "skillup-courses"
const LEARNING_PATHS_STORAGE_KEY = "skillup-learning-paths"

export default function LearningPathManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([])
  const [pathToDelete, setPathToDelete] = useState<LearningPath | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY)
    setCourses(storedCourses ? JSON.parse(storedCourses) : initialCourses)

    const storedPaths = localStorage.getItem(LEARNING_PATHS_STORAGE_KEY)
    setLearningPaths(
      storedPaths ? JSON.parse(storedPaths) : initialLearningPaths
    )
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(
        LEARNING_PATHS_STORAGE_KEY,
        JSON.stringify(learningPaths)
      )
    }
  }, [learningPaths, isLoaded])

  const handlePathAdded = (newPath: LearningPath) => {
    setLearningPaths((prev) => [newPath, ...prev])
  }

  const handlePathUpdated = (updatedPath: LearningPath) => {
    setLearningPaths((prev) =>
      prev.map((p) => (p.id === updatedPath.id ? updatedPath : p))
    )
  }

  const handleConfirmDelete = () => {
    if (pathToDelete) {
      setLearningPaths((prev) => prev.filter((p) => p.id !== pathToDelete.id))
      toast({
        title: "Learning Path Deleted",
        description: `The path "${pathToDelete.title}" has been deleted.`,
      })
      setPathToDelete(null)
    }
  }

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Learning Paths</h1>
          <p className="text-muted-foreground">
            Group courses into guided learning sequences for your staff.
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>All Learning Paths</CardTitle>
              <CardDescription>
                A list of all learning paths in the system.
              </CardDescription>
            </div>
            <AddLearningPathDialog
              courses={courses}
              onPathAdded={handlePathAdded}
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Courses</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {learningPaths.map((path) => (
                  <TableRow key={path.id}>
                    <TableCell className="font-medium">{path.title}</TableCell>
                    <TableCell>{path.description}</TableCell>
                    <TableCell className="text-center">
                      {path.courseIds.length}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <EditLearningPathDialog
                          learningPath={path}
                          courses={courses}
                          onPathUpdated={handlePathUpdated}
                        />
                         <Button variant="destructive-outline" size="sm" onClick={() => setPathToDelete(path)}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {learningPaths.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No learning paths have been created yet.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!pathToDelete}
        onOpenChange={(open) => !open && setPathToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              learning path{" "}
              <span className="font-semibold">"{pathToDelete?.title}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
