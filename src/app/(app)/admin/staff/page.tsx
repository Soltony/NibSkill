
import { districts, branches, departments } from "@/lib/data"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PlusCircle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StaffManagementPage() {
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
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add District
                    </Button>
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
                                <Button variant="outline" size="sm">Edit</Button>
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
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Branch
                    </Button>
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
                                    <Button variant="outline" size="sm">Edit</Button>
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
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Department
                    </Button>
                </Header>
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
                                    <Button variant="outline" size="sm">Edit</Button>
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
