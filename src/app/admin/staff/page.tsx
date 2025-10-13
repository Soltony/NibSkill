
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddDistrictDialog } from "@/components/add-district-dialog"
import { EditDistrictDialog, DeleteDistrictButton } from "@/components/edit-district-dialog"
import { AddBranchDialog } from "@/components/add-branch-dialog"
import { EditBranchDialog, DeleteBranchButton } from "@/components/edit-branch-dialog"
import { AddDepartmentDialog } from "@/components/add-department-dialog"
import { EditDepartmentDialog, DeleteDepartmentButton } from "@/components/edit-department-dialog"
import prisma from "@/lib/db"

export default async function StaffManagementPage() {
  const districts = await prisma.district.findMany({ orderBy: { name: 'asc' }});
  const branches = await prisma.branch.findMany({ include: { district: true }, orderBy: { name: 'asc' }});
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }});

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
        </TabsContent>
        <TabsContent value="branches">
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
        </TabsContent>
        <TabsContent value="departments">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
