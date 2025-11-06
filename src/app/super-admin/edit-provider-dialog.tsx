
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
import { updateTrainingProvider } from "@/app/actions/super-admin-actions"
import type { TrainingProvider, User } from "@prisma/client"

const formSchema = z.object({
  providerId: z.string(),
  name: z.string().min(2, "Provider name is required."),
  address: z.string().min(5, "Address is required."),
  accountNumber: z.string().min(5, "Account number is required."),
  adminId: z.string(),
  adminName: z.string().min(2, "Admin name is required."),
  adminEmail: z.string().email("A valid email is required."),
  adminPhoneNumber: z.string().min(5, "A valid phone number is required."),
})

type EditProviderDialogProps = {
  provider: TrainingProvider;
  admin: User;
}

export function EditProviderDialog({ provider, admin }: EditProviderDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (open) {
      form.reset({
        providerId: provider.id,
        name: provider.name,
        address: provider.address,
        accountNumber: provider.accountNumber,
        adminId: admin.id,
        adminName: admin.name,
        adminEmail: admin.email ?? '',
        adminPhoneNumber: admin.phoneNumber ?? '',
      })
    }
  }, [open, provider, admin, form])

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateTrainingProvider(values);
    if (result.success) {
        toast({
            title: "Provider Updated",
            description: `The provider "${values.name}" has been successfully updated.`,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Training Provider</DialogTitle>
          <DialogDescription>
            Update the details for "{provider.name}".
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
             <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="border-t pt-4">
                 <FormField
                control={form.control}
                name="adminName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Admin Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="adminEmail"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Admin Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="adminPhoneNumber"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Admin Phone Number</FormLabel>
                    <FormControl><Input type="tel" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
