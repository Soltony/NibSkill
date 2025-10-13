
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { updateDistrict, deleteDistrict } from "@/app/actions/staff-actions"
import type { District } from "@prisma/client"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
})

type EditDistrictDialogProps = {
  district: District
}

export function EditDistrictDialog({ district }: EditDistrictDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: district.name,
    },
  })
  
  useEffect(() => {
    if (open) {
      form.reset({
        name: district.name,
      })
    }
  }, [open, district, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateDistrict(district.id, values)
    if (result.success) {
      toast({
        title: "District Updated",
        description: `The district "${values.name}" has been successfully updated.`,
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
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit District</DialogTitle>
          <DialogDescription>
            Update the details for the district below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>District Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., North Region" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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

export function DeleteDistrictButton({ district }: { district: District }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const handleDelete = async () => {
        const result = await deleteDistrict(district.id);
        if (result.success) {
            toast({
                title: "District Deleted",
                description: `The district "${district.name}" has been deleted.`,
            });
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            });
        }
        setOpen(false);
    };

    return (
        <>
            <Button variant="destructive-outline" size="sm" onClick={() => setOpen(true)}>Delete</Button>
            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the district <span className="font-semibold">"{district.name}"</span>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
