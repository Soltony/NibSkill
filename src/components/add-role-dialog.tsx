
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { PlusCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addRole } from "@/app/actions/settings-actions"
import { Checkbox } from "./ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { ScrollArea } from "./ui/scroll-area"

const permissionSchema = z.object({
  c: z.boolean(),
  r: z.boolean(),
  u: z.boolean(),
  d: z.boolean(),
});

const formSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters."),
  permissions: z.object({
    dashboard: permissionSchema,
    products: permissionSchema,
    courses: permissionSchema,
    learningPaths: permissionSchema,
    quizzes: permissionSchema,
    grading: permissionSchema,
    liveSessions: permissionSchema,
    reports: permissionSchema,
    settings: permissionSchema,
  })
})

const permissionAreas = [
  "dashboard", "products", "courses", "learningPaths", "quizzes", "grading", "liveSessions", "reports", "settings"
] as const;

export function AddRoleDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      permissions: {
        dashboard: { c: false, r: true, u: false, d: false },
        products: { c: false, r: true, u: false, d: false },
        courses: { c: false, r: true, u: false, d: false },
        learningPaths: { c: false, r: true, u: false, d: false },
        quizzes: { c: false, r: true, u: false, d: false },
        grading: { c: false, r: true, u: false, d: false },
        liveSessions: { c: false, r: true, u: false, d: false },
        reports: { c: false, r: true, u: false, d: false },
        settings: { c: false, r: false, u: false, d: false },
      }
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Manually construct the payload to match the old schema for the server action
    const submissionValues = {
        name: values.name,
        permissions: {
            analytics: values.permissions.dashboard, // Map dashboard to analytics
            products: values.permissions.products,
            courses: values.permissions.courses,
            // learningPaths is not in old schema, so we omit it or decide on a mapping
            quizzes: values.permissions.quizzes,
            // grading is not in old schema
            liveSessions: values.permissions.liveSessions,
            users: values.permissions.settings, // Map settings to users
            staff: values.permissions.settings // Map settings to staff as well, or handle differently
        }
    };

    const result = await addRole(submissionValues as any);
    if (result.success) {
      toast({
        title: "Role Added",
        description: `The role "${values.name}" has been successfully created.`,
      })
      setOpen(false)
      form.reset()
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Role</DialogTitle>
          <DialogDescription>
            Define a new role and set its permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Content Manager" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Permissions</FormLabel>
              <ScrollArea className="h-72 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Area</TableHead>
                      <TableHead className="text-center">Create</TableHead>
                      <TableHead className="text-center">Read</TableHead>
                      <TableHead className="text-center">Update</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {permissionAreas.map(area => (
                      <TableRow key={area}>
                        <TableCell className="font-medium capitalize">{area.replace(/([A-Z])/g, ' $1')}</TableCell>
                        {(['c', 'r', 'u', 'd'] as const).map(p => (
                          <TableCell key={p} className="text-center">
                            <FormField
                              control={form.control}
                              name={`permissions.${area}.${p}`}
                              render={({ field }) => (
                                <FormItem className="flex justify-center">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </FormItem>

            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
