
"use client";

import { useState, useEffect } from "react";
import type { Course } from "@prisma/client";
import { GripVertical, Plus, X, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

type CourseWithStatus = Course & { status?: string };

type CourseSequenceSelectorProps = {
  allCourses: CourseWithStatus[];
  selectedCourseIds: string[];
  onSelectedCourseIdsChange: (ids: string[]) => void;
};

export function CourseSequenceSelector({
  allCourses,
  selectedCourseIds,
  onSelectedCourseIdsChange,
}: CourseSequenceSelectorProps) {

  const [availableCourses, setAvailableCourses] = useState<CourseWithStatus[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<CourseWithStatus[]>([]);
  const [draggedCourse, setDraggedCourse] = useState<CourseWithStatus | null>(null);

  useEffect(() => {
    const selectedSet = new Set(selectedCourseIds);
    setAvailableCourses(allCourses.filter(c => !selectedSet.has(c.id) && c.status === 'PUBLISHED'));
    
    const orderedSelected = selectedCourseIds.map(id => allCourses.find(c => c.id === id)).filter((c): c is CourseWithStatus => !!c);
    setSelectedCourses(orderedSelected);

  }, [selectedCourseIds, allCourses]);

  const handleAddCourse = (course: CourseWithStatus) => {
    onSelectedCourseIdsChange([...selectedCourseIds, course.id]);
  };

  const handleRemoveCourse = (course: CourseWithStatus) => {
    onSelectedCourseIdsChange(selectedCourseIds.filter(id => id !== course.id));
  };
  
  const handleDragStart = (course: CourseWithStatus) => {
    setDraggedCourse(course);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
  };

  const handleDrop = (targetCourse: CourseWithStatus) => {
    if (!draggedCourse || draggedCourse.id === targetCourse.id) return;

    const currentIds = [...selectedCourseIds];
    const draggedIndex = currentIds.indexOf(draggedCourse.id);
    const targetIndex = currentIds.indexOf(targetCourse.id);

    currentIds.splice(draggedIndex, 1);
    currentIds.splice(targetIndex, 0, draggedCourse.id);

    onSelectedCourseIdsChange(currentIds);
    setDraggedCourse(null);
  };


  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <h4 className="font-medium text-sm mb-2">Available Courses</h4>
        <Card>
          <ScrollArea className="h-64">
            <CardContent className="p-2">
              {availableCourses.length > 0 ? (
                <ul>
                  {availableCourses.map((course) => (
                    <li key={course.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                      <span className="text-sm">{course.title}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleAddCourse(course)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No more published courses available.
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
      <div>
        <h4 className="font-medium text-sm mb-2">Selected Courses (in order)</h4>
        <Card>
          <ScrollArea className="h-64">
            <CardContent className="p-2">
              {selectedCourses.length > 0 ? (
                <ul>
                  {selectedCourses.map((course, index) => (
                    <li
                      key={course.id}
                      draggable
                      onDragStart={() => handleDragStart(course)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(course)}
                      className={`flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-grab transition-opacity ${draggedCourse?.id === course.id ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          <span className="font-mono text-muted-foreground text-xs mr-2">{index + 1}.</span>
                          {course.title}
                           {course.status !== 'PUBLISHED' && (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="ml-2">
                                                <AlertCircle className="h-4 w-4 text-destructive inline" />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>This course is no longer published and will not be visible to users.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                           )}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleRemoveCourse(course)}
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Add courses from the left.
                </div>
              )}
            </CardContent>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
