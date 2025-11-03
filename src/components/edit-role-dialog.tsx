
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
import { useToast } from "@/hooks/use-toast"
import { updateRole } from "@/app/actions/settings-actions"
import { Checkbox } from "./ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import { ScrollArea } from "./ui/scroll-area"
import type { Role as RoleType } from "@prisma/client"

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

type EditRoleDialogProps = {
    role: RoleType;
    children: React.ReactNode;
}

export function EditRoleDialog({ role, children }: EditRoleDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (open) {
      const currentPerms = role.permissions as any;
      form.reset({
        name: role.name,
        permissions: {
            dashboard: currentPerms?.analytics || { c: false, r: false, u: false, d: false },
            products: currentPerms?.products || { c: false, r: false, u: false, d: false },
            courses: currentPerms?.courses || { c: false, r: false, u: false, d: false },
            learningPaths: currentPerms?.learningPaths || { c: false, r: false, u: false, d: false },
            quizzes: currentPerms?.quizzes || { c: false, r: false, u: false, d: false },
            grading: currentPerms?.grading || { c: false, r: false, u: false, d: false },
            liveSessions: currentPerms?.liveSessions || { c: false, r: false, u: false, d: false },
            reports: currentPerms?.reports || { c: false, r: false, u: false, d: false },
            settings: currentPerms?.users || { c: false, r: false, u: false, d: false },
        },
      })
    }
  }, [open, role, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
     const submissionValues = {
        name: values.name,
        permissions: {
            analytics: values.permissions.dashboard,
            users: values.permissions.settings,
            staff: values.permissions.settings,
            products: values.permissions.products,
            courses: values.permissions.courses,
            quizzes: values.permissions.quizzes,
            liveSessions: values.permissions.liveSessions,
        }
    };
    const result = await updateRole(role.id, submissionValues as any);
    if (result.success) {
      toast({
        title: "Role Updated",
        description: `The role "${values.name}" has been successfully updated.`,
      })
      setOpen(false)
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
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Role</DialogTitle>
          <DialogDescription>
            Update the name and permissions for this role.
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
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
