

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
  FormDescription,
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
import { useToast } from "@/hooks/use-toast"
import { updateCourse } from "@/app/actions/course-actions"
import type { Course, Product, District, Branch, Department } from "@prisma/client"
import { Switch } from "./ui/switch"
import { MultiSelect } from "./ui/multi-select"

type FullCourse = Course & {
    assignedDistricts: District[];
    assignedBranches: Branch[];
    assignedDepartments: Department[];
};

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  productId: z.string({ required_error: "Please select a product." }),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  isPaid: z.boolean().default(false),
  price: z.coerce.number().optional(),
  currency: z.enum(["USD", "ETB"]).optional(),
  hasCertificate: z.boolean().default(false),
  status: z.enum(["PENDING", "PUBLISHED", "REJECTED"]).optional(),
  isPublic: z.boolean().default(true),
  districtIds: z.array(z.string()).optional(),
  branchIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
}).refine(data => !data.isPaid || (data.price !== undefined && data.price > 0), {
    message: "Price must be a positive number for paid courses.",
    path: ["price"],
}).refine(data => !data.isPaid || (data.currency !== undefined), {
    message: "Currency is required for paid courses.",
    path: ["currency"],
});

type EditCourseDialogProps = {
  course: FullCourse;
  products: Product[];
  districts: District[];
  branches: Branch[];
  departments: Department[];
  children: React.ReactNode;
}

export function EditCourseDialog({ course, products, districts, branches, departments, children }: EditCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })
  
  const isPaid = form.watch("isPaid");
  const isPublic = form.watch("isPublic");

  useEffect(() => {
    if (open) {
      form.reset({
        title: course.title,
        productId: course.productId ?? "",
        description: course.description,
        isPaid: course.isPaid,
        price: course.price ?? undefined,
        currency: course.currency ?? undefined,
        hasCertificate: course.hasCertificate,
        status: course.status,
        isPublic: course.isPublic,
        districtIds: course.assignedDistricts.map(d => d.id),
        branchIds: course.assignedBranches.map(b => b.id),
        departmentIds: course.assignedDepartments.map(d => d.id),
      })
    }
  }, [open, course, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateCourse(course.id, values as any);
    if (result.success) {
        toast({
            title: "Success",
            description: result.message,
        })
        setOpen(false)
    } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  const isRejected = course?.status === 'REJECTED';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Course</DialogTitle>
          <DialogDescription>
            Update the details for the course below.
            {isRejected && " Saving will resubmit the course for approval."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Public Course</FormLabel>
                    <FormDescription>
                      Should this course be visible to everyone?
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
            {!isPublic && (
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-medium">Assign to (Optional)</h3>
                     <FormField
                        control={form.control}
                        name="departmentIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Departments</FormLabel>
                                <MultiSelect
                                    options={departments.map(d => ({ value: d.id, label: d.name }))}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select departments..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="districtIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Districts</FormLabel>
                                <MultiSelect
                                    options={districts.map(d => ({ value: d.id, label: d.name }))}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select districts..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="branchIds"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Branches</FormLabel>
                                <MultiSelect
                                    options={branches.map(b => ({ value: b.id, label: b.name }))}
                                    selected={field.value || []}
                                    onChange={field.onChange}
                                    placeholder="Select branches..."
                                />
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}
             <FormField
              control={form.control}
              name="isPaid"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Paid Course</FormLabel>
                    <FormDescription>
                      Is this a paid course?
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
            {isPaid && (
               <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 49.99" {...field} step="0.01" value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="USD">USD ($)</SelectItem>
                                <SelectItem value="ETB">ETB (Br)</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
               </div>
            )}
            <FormField
              control={form.control}
              name="hasCertificate"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Award a Certificate</FormLabel>
                    <FormDescription>
                      Does this course award a certificate upon completion?
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
             <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={course.status === 'PENDING' || course.status === 'REJECTED'}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="PUBLISHED">Published</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                    {(course.status === 'PENDING' || course.status === 'REJECTED') && (
                        <FormDescription>
                           This status cannot be changed directly. {isRejected ? "Saving will resubmit it for approval." : "Change status via the 'Approvals' page."}
                        </FormDescription>
                    )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting 
                  ? (isRejected ? 'Resubmitting...' : 'Saving...')
                  : (isRejected ? 'Save & Resubmit' : 'Save Changes')
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
