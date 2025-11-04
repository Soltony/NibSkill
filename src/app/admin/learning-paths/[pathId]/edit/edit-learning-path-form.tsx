
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { updateLearningPath } from "@/app/actions/learning-path-actions"
import type { LearningPath, Course } from "@prisma/client"
import { CourseSequenceSelector } from "@/components/course-sequence-selector"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { useRouter } from "next/navigation"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  courseIds: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one course.",
  }),
  hasCertificate: z.boolean().default(false),
})

type CourseWithStatus = Course & { status: string };
type LearningPathWithCourses = LearningPath & { courses: { course: CourseWithStatus }[] };

type EditLearningPathFormProps = {
  learningPath: LearningPathWithCourses
  allPublishedCourses: Course[]
}

export function EditLearningPathForm({ learningPath, allPublishedCourses }: EditLearningPathFormProps) {
  const { toast } = useToast()
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: learningPath.title,
      description: learningPath.description ?? "",
      courseIds: learningPath.courses.map(c => c.course.id),
      hasCertificate: learningPath.hasCertificate,
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateLearningPath(learningPath.id, values);
    if (result.success) {
      toast({
        title: "Learning Path Updated",
        description: `The path "${values.title}" has been successfully updated.`,
      })
      router.push("/admin/learning-paths");
    } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  // Combine currently selected courses (even if not published) with all other published courses for the selector
  const allAvailableCourses = [...allPublishedCourses];
  learningPath.courses.forEach(({ course }) => {
    if (!allAvailableCourses.some(c => c.id === course.id)) {
      allAvailableCourses.push(course);
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
            <CardContent className="pt-6 space-y-6">
                <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Path Title</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., New Hire Onboarding" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="A brief summary of what this path covers."
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="courseIds"
                render={({ field }) => (
                    <FormItem>
                    <div className="mb-2">
                        <FormLabel>Courses</FormLabel>
                        <FormDescription>
                            Select from published courses. Drag and drop to reorder.
                        </FormDescription>
                    </div>
                        <CourseSequenceSelector
                            allCourses={allAvailableCourses}
                            selectedCourseIds={field.value}
                            onSelectedCourseIdsChange={field.onChange}
                        />
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="hasCertificate"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <FormLabel>Award a Certificate</FormLabel>
                        <FormDescription>
                        Does this path award a certificate upon completion?
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        />
                    </FormControl>
                    </FormItem>
                )}
                />
            </CardContent>
            <CardFooter>
                 <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  )
}
