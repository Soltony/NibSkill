
"use client"
import { districts as initialDistricts, branches as initialBranches, departments as initialDepartments } from "@/lib/data"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeatureNotImplementedDialog } from "@/components/feature-not-implemented-dialog"
import { useState, useEffect } from "react"
import type { District, Branch, Department } from "@/lib/data"

export default function StaffManagementPage() {
  // In a real app, this would be fetched from a server.
  // For the prototype, we just use the static data.
  const [districts, setDistricts] = useState<District[]>(initialDistricts)
  const [branches, setBranches] = useState<Branch[]>(initialBranches)
  const [departments, setDepartments] = useState<Department[]>(initialDepartments)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Staff Management</h1>
        <p className="text-muted-foreground">
          Manage your organization's structure: districts, branches, and departments.
        </p>
      </div>
      <Tabs defaultValue="districts">
        <TabsList>
          <TabsTrigger value="districts">Districts</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
        </TabsList>
        <TabsContent value="districts">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Districts</CardTitle>
                        <CardDescription>A list of all registered districts.</CardDescription>
                    </div>
                    <FeatureNotImplementedDialog
                        title="Add New District"
                        description="In a full application, this would open a form to create a new organizational district."
                        triggerText="Add District"
                        triggerIcon={<PlusCircle className="mr-2 h-4 w-4" />}
                    />
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
                                <FeatureNotImplementedDialog
                                    title="Edit District"
                                    description="This would open a form to modify the district name."
                                    isMenuItem={false}
                                    triggerVariant="outline"
                                    triggerSize="sm"
                                >
                                    Edit
                                </FeatureNotImplementedDialog>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="branches">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Branches</CardTitle>
                        <CardDescription>A list of all registered branches.</CardDescription>
                    </div>
                     <FeatureNotImplementedDialog
                        title="Add New Branch"
                        description="In a full application, this would open a form to create a new branch and assign it to a district."
                        triggerText="Add Branch"
                        triggerIcon={<PlusCircle className="mr-2 h-4 w-4" />}
                    />
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
                                <TableCell>{districts.find(d => d.id === branch.districtId)?.name}</TableCell>
                                <TableCell className="text-right">
                                    <FeatureNotImplementedDialog
                                        title="Edit Branch"
                                        description="This would open a form to modify the branch details."
                                        isMenuItem={false}
                                        triggerVariant="outline"
                                        triggerSize="sm"
                                    >
                                        Edit
                                    </FeatureNotImplementedDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="departments">
             <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>All Departments</CardTitle>
                        <CardDescription>A list of all registered departments.</CardDescription>
                    </div>
                    <FeatureNotImplementedDialog
                        title="Add New Department"
                        description="In a full application, this would open a form to create a new department."
                        triggerText="Add Department"
                        triggerIcon={<PlusCircle className="mr-2 h-4 w-4" />}
                    />
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
                                    <FeatureNotImplementedDialog
                                        title="Edit Department"
                                        description="This would open a form to modify the department name."
                                        isMenuItem={false}
                                        triggerVariant="outline"
                                        triggerSize="sm"
                                    >
                                        Edit
                                    </FeatureNotImplementedDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
