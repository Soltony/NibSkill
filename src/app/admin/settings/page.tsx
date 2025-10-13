
"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { users as initialUsers, roles as initialRoles, type User, type Role, type Permission, initialRegistrationFields } from "@/lib/data"
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
import { Label } from "@/components/ui/label"
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
import type { RegistrationField } from "@/lib/data"
import { AddFieldDialog } from "@/components/add-field-dialog"

const USERS_STORAGE_KEY = "skillup-users"
const ROLES_STORAGE_KEY = "skillup-roles";
const REGISTRATION_FIELDS_STORAGE_KEY = "skillup-registration-fields";

const registrationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "staff"]),
})

const registrationFieldsSchema = z.object({
    fields: z.array(z.object({
        id: z.string(),
        label: z.string(),
        enabled: z.boolean(),
        required: z.boolean(),
    }))
})

const CrudPermissions = ({ permissions }: { permissions: Permission }) => {
  const letters: (keyof Permission)[] = ['c', 'r', 'u', 'd'];
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

export default function SettingsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [isLoaded, setIsLoaded] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const { toast } = useToast()

  const [availableFields, setAvailableFields] = useState<RegistrationField[]>(initialRegistrationFields);
  const [fieldToDelete, setFieldToDelete] = useState<RegistrationField | null>(null);

  const registrationFieldsForm = useForm<z.infer<typeof registrationFieldsSchema>>({
    resolver: zodResolver(registrationFieldsSchema),
    defaultValues: {
      fields: []
    }
  });

  const { fields: regFields } = useFieldArray({
    control: registrationFieldsForm.control,
    name: "fields"
  });

  useEffect(() => {
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY)
    setUsers(storedUsers ? JSON.parse(storedUsers) : initialUsers)
    
    const storedRoles = localStorage.getItem(ROLES_STORAGE_KEY)
    setRoles(storedRoles ? JSON.parse(storedRoles) : initialRoles)
    
    // Load available fields first
    const storedAvailable = localStorage.getItem(REGISTRATION_FIELDS_STORAGE_KEY);
    const avFields = storedAvailable ? JSON.parse(storedAvailable) : initialRegistrationFields;
    setAvailableFields(avFields);

    // Then load their enabled/required settings, defaulting from available fields if not set
    const storedSettings = localStorage.getItem(REGISTRATION_FIELDS_STORAGE_KEY + "-settings");
    if (storedSettings) {
        registrationFieldsForm.reset({ fields: JSON.parse(storedSettings) });
    } else {
        registrationFieldsForm.reset({ fields: avFields });
    }

    setIsLoaded(true)
  }, [])
  
  useEffect(() => {
    if(!isLoaded) return;
    const currentSettings = registrationFieldsForm.getValues('fields');
    const newFieldSettings = availableFields.map(af => {
        const existing = currentSettings.find(cs => cs.id === af.id);
        return existing || { ...af, enabled: false, required: false };
    });
    // Reset the entire form's `fields` array
    registrationFieldsForm.reset({ fields: newFieldSettings });
  }, [availableFields, isLoaded, registrationFieldsForm])


  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    }
  }, [users, isLoaded])
  
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(ROLES_STORAGE_KEY, JSON.stringify(roles))
    }
  }, [roles, isLoaded])

  useEffect(() => {
    if (isLoaded) {
        localStorage.setItem(REGISTRATION_FIELDS_STORAGE_KEY, JSON.stringify(availableFields));
    }
  }, [availableFields, isLoaded]);

  const onRegistrationFieldsSubmit = (values: z.infer<typeof registrationFieldsSchema>) => {
    localStorage.setItem(REGISTRATION_FIELDS_STORAGE_KEY + "-settings", JSON.stringify(values.fields));
    toast({
        title: "Settings Saved",
        description: "Your registration form settings have been updated.",
    });
  }

  const handleRoleChange = (userId: string, newRole: "admin" | "staff") => {
    setUsers(
      users.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    )
    toast({ title: "User role updated" })
  }

  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "staff",
    },
  })

  const onRegisterUser = (values: z.infer<typeof registrationSchema>) => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: values.name,
      email: values.email,
      role: values.role,
      avatarUrl: `https://picsum.photos/seed/user${Date.now()}/100/100`,
      department: "Unassigned",
      district: "Unassigned",
      branch: "Unassigned",
      phoneNumber: "",
    }
    setUsers([...users, newUser])
    toast({ title: "User Registered", description: `${values.name} has been added.` })
    form.reset()
  }

  const handleConfirmDelete = () => {
    if (roleToDelete) {
      if (roleToDelete.id === 'admin' || roleToDelete.id === 'staff') {
        toast({
          title: "Cannot Delete Core Role",
          description: `The "${roleToDelete.name}" role is essential to the application and cannot be deleted.`,
          variant: "destructive"
        });
      } else {
        setRoles(prevRoles => prevRoles.filter(r => r.id !== roleToDelete!.id));
        toast({
          title: "Role Deleted",
          description: `The role "${roleToDelete.name}" has been deleted.`,
        });
      }
      setRoleToDelete(null);
    }
  };
  
  const handleFieldAdded = (newField: { id: string, label: string }) => {
    setAvailableFields(prev => [...prev, { ...newField, enabled: false, required: false }]);
  };

  const handleConfirmDeleteField = () => {
    if (fieldToDelete) {
        setAvailableFields(prev => prev.filter(f => f.id !== fieldToDelete.id));
        toast({
            title: "Field Deleted",
            description: `The field "${fieldToDelete.label}" has been removed.`,
        });
        setFieldToDelete(null);
    }
  };


  const permissionKeys = Object.keys(roles[0]?.permissions || {}) as (keyof Role['permissions'])[];

  return (
    <>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Settings</h1>
          <p className="text-muted-foreground">
            Manage application settings, users, and roles.
          </p>
        </div>
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
                            value={user.role}
                            onValueChange={(newRole: "admin" | "staff") =>
                              handleRoleChange(user.id, newRole)
                            }
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
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
                            <CrudPermissions permissions={role.permissions[key]} />
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
                      name="role"
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
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Register User
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
                            <Button type="submit">Save Settings</Button>
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
                           <AddFieldDialog onFieldAdded={handleFieldAdded} />
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
                                    {availableFields.map(field => (
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
      </div>

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
