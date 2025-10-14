
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
    courses: permissionSchema,
    users: permissionSchema,
    analytics: permissionSchema,
    products: permissionSchema,
    quizzes: permissionSchema,
    staff: permissionSchema,
    liveSessions: permissionSchema,
  })
})

const permissionAreas = [
  "courses", "users", "analytics", "products", "quizzes", "staff", "liveSessions"
] as const;

export function AddRoleDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      permissions: {
        courses: { c: false, r: true, u: false, d: false },
        users: { c: false, r: false, u: false, d: false },
        analytics: { c: false, r: false, u: false, d: false },
        products: { c: false, r: true, u: false, d: false },
        quizzes: { c: false, r: true, u: false, d: false },
        staff: { c: false, r: false, u: false, d: false },
        liveSessions: { c: false, r: true, u: false, d: false },
      }
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await addRole(values)
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
                        <TableCell className="font-medium capitalize">{area}</TableCell>
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
