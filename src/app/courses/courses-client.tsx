
"use client"

import { useState, useMemo } from "react"
import { CourseCard } from "@/components/course-card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search } from "lucide-react"
import type { Course, TrainingProvider } from "@prisma/client"

type CourseWithRelations = Course & {
  progress: number;
  product: any;
  modules: any[];
  trainingProvider: TrainingProvider | null;
};

type CoursesClientProps = {
  courses: CourseWithRelations[];
  trainingProviders: TrainingProvider[];
}

export function CoursesClient({ courses, trainingProviders }: CoursesClientProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [providerFilter, setProviderFilter] = useState("all")

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      // Status filter
      const statusMatch =
        statusFilter === "all" ||
        (statusFilter === "not-started" && course.progress === 0) ||
        (statusFilter === "in-progress" && course.progress > 0 && course.progress < 100) ||
        (statusFilter === "completed" && course.progress === 100)
      
      // Provider filter
      const providerMatch = providerFilter === "all" || course.trainingProviderId === providerFilter

      // Search term filter
      const searchMatch =
        searchTerm === "" ||
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase())

      return statusMatch && providerMatch && searchMatch
    })
  }, [courses, searchTerm, statusFilter, providerFilter])

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search courses..."
            className="pl-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
            </Select>

            <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by provider" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {trainingProviders.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                </SelectItem>
                ))}
            </SelectContent>
            </Select>
        </div>
      </div>
      
      {filteredCourses.length > 0 ? (
         <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCourses.map(course => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
         <div className="text-center py-20 text-muted-foreground bg-muted/20 rounded-lg">
            <p className="text-lg font-medium">No courses match your criteria.</p>
            <p>Try adjusting your search or filters.</p>
        </div>
      )}
    </div>
  )
}
