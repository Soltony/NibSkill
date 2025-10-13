
"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { Role as RoleType, Permission as PermissionType, RegistrationField } from "@prisma/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
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
import { FeatureNotImplementedDialog } from "@/components/feature-not-implemented-dialog"
import { Switch } from "@/components/ui/switch"
import { AddFieldDialog } from "@/components/add-field-dialog"
import { updateUserRole, registerUser, deleteRole, updateRegistrationFields, deleteRegistrationField } from "@/app/actions/settings-actions"

type UserWithRole = any;

const registrationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string({ required_error: "A role is required." }),
})

const registrationFieldsSchema = z.object({
    fields: z.array(z.object({
        id: z.string(),
        label: z.string(),
        enabled: z.boolean(),
        required: z.boolean(),
    }))
})

const CrudPermissions = ({ permissions }: { permissions: any }) => {
  const letters: (keyof PermissionType)[] = ['c', 'r', 'u', 'd'];
  return (
    <div className="flex space-x-1 tracking-widest">
      {letters.map(letter => (
        <span 
          key={letter} 
          className={cn(
            'font-mono font-bold',
            permissions[letter] ? 'text-green-500' : 'text-muted-foreground/30'
          )}
        >
          {letter.toUpperCase()}
        </span>
      ))}
    </div>
  )
}

type SettingsTabsProps = {
    users: UserWithRole[];
    roles: RoleType[];
    registrationFields: RegistrationField[];
}

export function SettingsTabs({ users, roles, registrationFields: initialRegistrationFields }: SettingsTabsProps) {
  const [roleToDelete, setRoleToDelete] = useState<RoleType | null>(null);
  const { toast } = useToast()

  const [fieldToDelete, setFieldToDelete] = useState<RegistrationField | null>(null);

  const registrationFieldsForm = useForm<z.infer<typeof registrationFieldsSchema>>({
    resolver: zodResolver(registrationFieldsSchema),
    defaultValues: {
      fields: initialRegistrationFields
    }
  });

  const { fields: regFields, replace: replaceRegFields } = useFieldArray({
    control: registrationFieldsForm.control,
    name: "fields"
  });

  const onRegistrationFieldsSubmit = async (values: z.infer<typeof registrationFieldsSchema>) => {
    const result = await updateRegistrationFields(values);
    if (result.success) {
        toast({
            title: "Settings Saved",
            description: result.message,
        });
    } else {
        toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
        })
    }
  }

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    const result = await updateUserRole({ userId, roleId: newRoleId });
    if (result.success) {
        toast({ title: "User role updated" })
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  }

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      roleId: roles.find(r => r.name === 'Staff')?.id
    },
  })

  const onRegisterUser = async (values: z.infer<typeof registrationSchema>) => {
    const result = await registerUser(values);
    if (result.success) {
        toast({ title: "User Registered", description: `${values.name} has been added.` })
        form.reset()
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
  }

  const handleConfirmDelete = async () => {
    if (roleToDelete) {
      if (roleToDelete.name === 'Admin' || roleToDelete.name === 'Staff') {
        toast({
          title: "Cannot Delete Core Role",
          description: `The "${roleToDelete.name}" role is essential to the application and cannot be deleted.`,
          variant: "destructive"
        });
      } else {
        const result = await deleteRole(roleToDelete.id);
        if (result.success) {
            toast({
              title: "Role Deleted",
              description: result.message,
            });
        } else {
            toast({
                title: "Error Deleting Role",
                description: result.message,
                variant: "destructive"
            });
        }
      }
      setRoleToDelete(null);
    }
  };

  const handleConfirmDeleteField = async () => {
    if (fieldToDelete) {
        const result = await deleteRegistrationField(fieldToDelete.id);
        if(result.success) {
            toast({
                title: "Field Deleted",
                description: `The field "${fieldToDelete.label}" has been removed.`,
            });
            // This is a client-side removal for immediate feedback.
            // The list will be accurate on next page load from the server.
            replaceRegFields(regFields.filter(f => f.id !== fieldToDelete.id));
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setFieldToDelete(null);
    }
  };


  const permissionKeys = roles[0] ? Object.keys(roles[0].permissions as any) as (keyof RoleType['permissions'])[] : [];

  return (
    <>
      <Tabs defaultValue="user-management">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="user-management">User Management</TabsTrigger>
          <TabsTrigger value="role-management">Role Management</TabsTrigger>
          <TabsTrigger value="user-registration">User Registration</TabsTrigger>
          <TabsTrigger value="registration-settings">Registration</TabsTrigger>
        </TabsList>

        <TabsContent value="user-management">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Assign roles to users in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role.id}
                          onValueChange={(newRoleId) =>
                            handleRoleChange(user.id, newRoleId)
                          }
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role-management">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles</CardTitle>
                <CardDescription>
                  Define roles to control user access and permissions across the application.
                </CardDescription>
              </div>
              <FeatureNotImplementedDialog
                title="Add New Role"
                description="Adding new roles is not supported in this prototype. In a full application, this would open a form to create a new role and define its permissions, which would require code changes to be recognized by the system."
                triggerText="Add Role"
                triggerIcon={<PlusCircle className="mr-2 h-4 w-4" />}
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Role Name</TableHead>
                    {permissionKeys.map(key => (
                      <TableHead key={key} className="capitalize">{key}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      {permissionKeys.map(key => (
                        <TableCell key={key}>
                          <CrudPermissions permissions={(role.permissions as any)[key]} />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <FeatureNotImplementedDialog
                              title="Edit Role"
                              description="Editing roles is not supported in this prototype, as permissions are hard-coded into the application logic. Changes here would not reflect in actual user capabilities."
                              isMenuItem={true}
                            >
                              Edit
                            </FeatureNotImplementedDialog>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onSelect={() => setRoleToDelete(role)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user-registration">
          <Card>
            <CardHeader>
              <CardTitle>User Registration</CardTitle>
              <CardDescription>Add a new user to the system.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onRegisterUser)} className="space-y-6 max-w-lg">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="user@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="roleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {form.formState.isSubmitting ? "Registering..." : "Register User"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="registration-settings">
           <Tabs defaultValue="fields">
              <TabsList>
                  <TabsTrigger value="fields">Form Fields</TabsTrigger>
                  <TabsTrigger value="manage-fields">Manage Fields</TabsTrigger>
              </TabsList>
              <TabsContent value="fields">
                  <Card>
                  <Form {...registrationFieldsForm}>
                      <form onSubmit={registrationFieldsForm.handleSubmit(onRegistrationFieldsSubmit)}>
                      <CardHeader>
                          <CardTitle>Registration Form Settings</CardTitle>
                          <CardDescription>
                          Choose which fields to include in the staff self-registration form.
                          </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          <Table>
                          <TableHeader>
                              <TableRow>
                              <TableHead>Field</TableHead>
                              <TableHead className="text-center">Show on Form</TableHead>
                              <TableHead className="text-center">Make Required</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {regFields.map((field, index) => (
                                  <TableRow key={field.id}>
                                      <TableCell className="font-medium">{field.label}</TableCell>
                                      <TableCell className="text-center">
                                          <FormField
                                              control={registrationFieldsForm.control}
                                              name={`fields.${index}.enabled`}
                                              render={({ field }) => (
                                                  <FormItem>
                                                      <FormControl>
                                                          <Switch
                                                              checked={field.value}
                                                              onCheckedChange={field.onChange}
                                                          />
                                                      </FormControl>
                                                  </FormItem>
                                              )}
                                          />
                                      </TableCell>
                                      <TableCell className="text-center">
                                          <FormField
                                              control={registrationFieldsForm.control}
                                              name={`fields.${index}.required`}
                                              render={({ field }) => (
                                                  <FormItem>
                                                      <FormControl>
                                                          <Switch
                                                              checked={field.value}
                                                              onCheckedChange={field.onChange}
                                                              disabled={!registrationFieldsForm.watch(`fields.${index}.enabled`)}
                                                          />
                                                      </FormControl>
                                                  </FormItem>
                                              )}
                                          />
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                          </Table>
                      </CardContent>
                      <CardFooter>
                          <Button type="submit" disabled={registrationFieldsForm.formState.isSubmitting}>
                            {registrationFieldsForm.formState.isSubmitting ? "Saving..." : "Save Settings"}
                          </Button>
                      </CardFooter>
                      </form>
                  </Form>
                  </Card>
              </TabsContent>
              <TabsContent value="manage-fields">
                  <Card>
                      <CardHeader className="flex flex-row items-center justify-between">
                         <div>
                           <CardTitle>Manage Custom Fields</CardTitle>
                           <CardDescription>Add or remove fields available to the registration form.</CardDescription>
                         </div>
                         <AddFieldDialog />
                      </CardHeader>
                      <CardContent>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Field Label</TableHead>
                                      <TableHead>Field ID</TableHead>
                                      <TableHead className="text-right">Action</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {regFields.map(field => (
                                      <TableRow key={field.id}>
                                          <TableCell>{field.label}</TableCell>
                                          <TableCell><code className="text-xs bg-muted p-1 rounded">{field.id}</code></TableCell>
                                          <TableCell className="text-right">
                                              <Button variant="ghost" size="icon" onClick={() => setFieldToDelete(field)}>
                                                  <Trash2 className="h-4 w-4 text-destructive" />
                                              </Button>
                                          </TableCell>
                                      </TableRow>
                                  ))}
                              </TableBody>
                          </Table>
                      </CardContent>
                  </Card>
              </TabsContent>
           </Tabs>
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              role <span className="font-semibold">"{roleToDelete?.name}"</span>. 
              Core roles (Admin, Staff) cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this field?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the 
              field <span className="font-semibold">"{fieldToDelete?.label}"</span> and remove it from the registration form settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteField}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
