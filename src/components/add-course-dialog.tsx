

"use client"

import { useState } from "react"
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
import { PlusCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addCourse } from "@/app/actions/course-actions"
import type { Product, District, Branch, Department } from "@prisma/client"
import { Switch } from "./ui/switch"
import { MultiSelect } from "./ui/multi-select"

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  productId: z.string({ required_error: "Please select a product." }),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  isPaid: z.boolean().default(false),
  price: z.coerce.number().optional(),
  currency: z.enum(["USD", "ETB"]).optional(),
  hasCertificate: z.boolean().default(false),
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

type AddCourseDialogProps = {
  products: Product[]
  districts: District[]
  branches: Branch[]
  departments: Department[]
}

export function AddCourseDialog({ products, districts, branches, departments }: AddCourseDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      isPaid: false,
      price: undefined,
      currency: undefined,
      hasCertificate: false,
      isPublic: true,
      districtIds: [],
      branchIds: [],
      departmentIds: [],
    },
  })
  
  const isPaid = form.watch("isPaid");
  const isPublic = form.watch("isPublic");

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await addCourse(values as any);
    if (result.success) {
        toast({
            title: "Course Submitted",
            description: `The course "${values.title}" has been submitted for approval.`,
        })
        setOpen(false)
        form.reset()
    } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Course</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new training course.
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit for Approval'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
