

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
import { addRegistrationField } from "@/app/actions/settings-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { FieldType } from "@prisma/client"
import { Textarea } from "./ui/textarea"

const formSchema = z.object({
  label: z.string().min(2, "Label must be at least 2 characters."),
  id: z.string().min(2, "ID must be at least 2 characters.").regex(/^[a-zA-Z0-9_]+$/, "ID can only contain letters, numbers, and underscores."),
  type: z.nativeEnum(FieldType),
  options: z.string().optional(),
}).refine(data => {
  if (data.type === 'SELECT' && (!data.options || data.options.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: "Options are required for SELECT type (comma-separated).",
  path: ["options"],
});


export function AddFieldDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      id: "",
      type: "TEXT",
      options: "",
    },
  })
  
  const watchedType = form.watch('type');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await addRegistrationField(values);
    if (result.success) {
        toast({
        title: "Field Added",
        description: `The field "${values.label}" is now available.`,
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
          <PlusCircle className="mr-2 h-4 w-4" /> Add Field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Field</DialogTitle>
          <DialogDescription>
            Create a new field to be used in the registration form.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Label</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Employee ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field ID</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., employeeId" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a type" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {Object.values(FieldType).map(type => (
                             <SelectItem key={type} value={type}>{type}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedType === 'SELECT' && (
              <FormField
                control={form.control}
                name="options"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Options</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Comma-separated values, e.g., Option 1, Option 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Creating..." : "Create Field"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
