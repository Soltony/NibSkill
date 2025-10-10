
"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Course, Product } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  productId: z.string({ required_error: "Please select a product." }),
  description: z.string().min(10, "Description must be at least 10 characters long."),
})

type EditCourseDialogProps = {
  course: Course;
  products: Product[];
  onCourseUpdated: (course: Course) => void;
  children: React.ReactNode;
}

export function EditCourseDialog({ course, products, onCourseUpdated, children }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: course.title,
      productId: course.productId,
      description: course.description,
    },
  })
  
  useEffect(() => {
    if (open) {
      form.reset({
        title: course.title,
        productId: course.productId,
        description: course.description,
      })
    }
  }, [open, course, form])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    const selectedProduct = products.find(p => p.id === values.productId)
    if (!selectedProduct) {
        toast({ title: "Error", description: "Selected product not found.", variant: "destructive" })
        return
    }

    const updatedCourse: Course = {
      ...course,
      title: values.title,
      description: values.description,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      image: selectedProduct.image,
    }
    onCourseUpdated(updatedCourse)
    toast({
      title: "Course Updated",
      description: `The course "${updatedCourse.title}" has been successfully updated.`,
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update the details for the course below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction to FusionX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Associated Product</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {products.map(product => (
                                <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                      placeholder="A brief summary of the course content."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
