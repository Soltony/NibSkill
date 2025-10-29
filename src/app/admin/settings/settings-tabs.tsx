

"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import type { User, Role as RoleType, Permission as PermissionType, RegistrationField, FieldType as TFieldType, LoginHistory, District, Branch, Department } from "@prisma/client"
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
import { Switch } from "@/components/ui/switch"
import { AddFieldDialog } from "@/components/add-field-dialog"
import { AddRoleDialog } from "@/components/add-role-dialog"
import { EditRoleDialog } from "@/components/edit-role-dialog"
import { updateUserRole, registerUser, deleteRole, updateRegistrationFields, deleteRegistrationField } from "@/app/actions/settings-actions"
import { Badge } from "@/components/ui/badge"
import { AddDistrictDialog } from "@/components/add-district-dialog"
import { EditDistrictDialog, DeleteDistrictButton } from "@/components/edit-district-dialog"
import { AddBranchDialog } from "@/components/add-branch-dialog"
import { EditBranchDialog, DeleteBranchButton } from "@/components/edit-branch-dialog"
import { AddDepartmentDialog } from "@/components/add-department-dialog"
import { EditDepartmentDialog, DeleteDepartmentButton } from "@/components/edit-department-dialog"

type UserWithRole = User & { role: RoleType };
type LoginHistoryWithUser = LoginHistory & { user: User };
type BranchWithDistrict = Branch & { district: District };

const registrationSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string({ required_error: "A role is required." }),
  phoneNumber: z.string().optional(),
})

const registrationFieldsSchema = z.object({
    fields: z.array(z.object({
        id: z.string(),
        label: z.string(),
        enabled: z.boolean(),
        required: z.boolean(),
        type: z.string(),
        options: z.array(z.string()).optional(),
        isLoginIdentifier: z.boolean().optional(),
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
    loginHistory: LoginHistoryWithUser[];
    districts: District[];
    branches: BranchWithDistrict[];
    departments: Department[];
}

export function SettingsTabs({ users, roles, registrationFields, loginHistory, districts, branches, departments }: SettingsTabsProps) {
  const [roleToDelete, setRoleToDelete] = useState<RoleType | null>(null);
  const { toast } = useToast()

  const [fieldToDelete, setFieldToDelete] = useState<RegistrationField | null>(null);

  const registrationFieldsForm = useForm<z.infer<typeof registrationFieldsSchema>>({
    resolver: zodResolver(registrationFieldsSchema),
    defaultValues: {
      fields: registrationFields.map(f => ({ ...f, type: f.type as string, options: f.options || [] }))
    }
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
            registrationFieldsForm.setValue('fields', registrationFieldsForm.getValues('fields').filter(f => f.id !== fieldToDelete.id));
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
        setFieldToDelete(null);
    }
  };


  const permissionKeys = (roles[0]?.permissions && Object.keys(roles[0].permissions as object)) as (keyof RoleType['permissions'])[] || [];


  return (
    <>
      <Tabs defaultValue="user-management">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="user-management">User Management</TabsTrigger>
          <TabsTrigger value="role-management">Role Management</TabsTrigger>
          <TabsTrigger value="user-registration">User Registration</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="login-history">Login History</TabsTrigger>
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
              <AddRoleDialog />
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
                            <EditRoleDialog role={role}>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    Edit
                                </DropdownMenuItem>
                            </EditRoleDialog>
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
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 2519..." {...field} />
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
        
        <TabsContent value="organization">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Districts</CardTitle>
                        <CardDescription>A list of all registered districts.</CardDescription>
                    </div>
                    <AddDistrictDialog />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>District Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {districts.map((district) => (
                            <TableRow key={district.id}>
                              <TableCell className="font-medium">{district.name}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <EditDistrictDialog district={district} />
                                  <DeleteDistrictButton district={district} />
                                </div>
                              </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Departments</CardTitle>
                        <CardDescription>A list of all registered departments.</CardDescription>
                    </div>
                    <AddDepartmentDialog />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Department Name</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {departments.map((department) => (
                            <TableRow key={department.id}>
                                <TableCell className="font-medium">{department.name}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <EditDepartmentDialog department={department} />
                                    <DeleteDepartmentButton department={department} />
                                  </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Branches</CardTitle>
                        <CardDescription>A list of all registered branches.</CardDescription>
                    </div>
                    <AddBranchDialog districts={districts} />
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Branch Name</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {branches.map((branch) => (
                            <TableRow key={branch.id}>
                                <TableCell className="font-medium">{branch.name}</TableCell>
                                <TableCell>{branch.district.name}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <EditBranchDialog branch={branch} districts={districts} />
                                    <DeleteBranchButton branch={branch} />
                                  </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        

        <TabsContent value="login-history">
          <Card>
            <CardHeader>
              <CardTitle>Login History</CardTitle>
              <CardDescription>
                An audit trail of recent user login activity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>User Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.user.name}</TableCell>
                      <TableCell>{entry.ipAddress || 'N/A'}</TableCell>
                      <TableCell>{new Date(entry.loginTime).toLocaleString()}</TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {entry.userAgent || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
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
