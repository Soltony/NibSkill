
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useState, useEffect } from "react"
import type { District, Branch, Department } from "@/lib/data"
import { useToast } from "@/hooks/use-toast"
import { AddDistrictDialog } from "@/components/add-district-dialog"
import { EditDistrictDialog } from "@/components/edit-district-dialog"
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
import { Button } from "@/components/ui/button"
import { AddBranchDialog } from "@/components/add-branch-dialog"
import { EditBranchDialog } from "@/components/edit-branch-dialog"
import { AddDepartmentDialog } from "@/components/add-department-dialog"
import { EditDepartmentDialog } from "@/components/edit-department-dialog"

const DISTRICTS_STORAGE_KEY = "skillup-districts";
const BRANCHES_STORAGE_KEY = "skillup-branches";
const DEPARTMENTS_STORAGE_KEY = "skillup-departments";


export default function StaffManagementPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { toast } = useToast();

  const [itemToDelete, setItemToDelete] = useState<{ type: 'district' | 'branch' | 'department'; data: District | Branch | Department } | null>(null);

  useEffect(() => {
    const storedDistricts = localStorage.getItem(DISTRICTS_STORAGE_KEY);
    setDistricts(storedDistricts ? JSON.parse(storedDistricts) : initialDistricts);

    const storedBranches = localStorage.getItem(BRANCHES_STORAGE_KEY);
    setBranches(storedBranches ? JSON.parse(storedBranches) : initialBranches);

    const storedDepartments = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
    setDepartments(storedDepartments ? JSON.parse(storedDepartments) : initialDepartments);

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DISTRICTS_STORAGE_KEY, JSON.stringify(districts));
    }
  }, [districts, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
    }
  }, [branches, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(departments));
    }
  }, [departments, isLoaded]);


  const handleDistrictAdded = (newDistrict: District) => {
    setDistricts(prev => [newDistrict, ...prev]);
  };

  const handleDistrictUpdated = (updatedDistrict: District) => {
    setDistricts(prev => prev.map(d => d.id === updatedDistrict.id ? updatedDistrict : d));
  };
  
  const handleBranchAdded = (newBranch: Branch) => {
    setBranches(prev => [newBranch, ...prev]);
  };

  const handleBranchUpdated = (updatedBranch: Branch) => {
    setBranches(prev => prev.map(b => b.id === updatedBranch.id ? updatedBranch : b));
  };

  const handleDepartmentAdded = (newDepartment: Department) => {
    setDepartments(prev => [newDepartment, ...prev]);
  };
  
  const handleDepartmentUpdated = (updatedDepartment: Department) => {
    setDepartments(prev => prev.map(d => d.id === updatedDepartment.id ? updatedDepartment : d));
  };

  const handleDelete = () => {
    if (!itemToDelete) return;

    const { type, data } = itemToDelete;
    let name = '';
    if (type === 'district') {
      setDistricts(prev => prev.filter(d => d.id !== data.id));
      name = (data as District).name;
    } else if (type === 'branch') {
      setBranches(prev => prev.filter(b => b.id !== data.id));
      name = (data as Branch).name;
    } else if (type === 'department') {
      setDepartments(prev => prev.filter(d => d.id !== data.id));
      name = (data as Department).name;
    }
    
    toast({
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} Deleted`,
      description: `"${name}" has been deleted.`,
    });
    setItemToDelete(null);
  };


  return (
    <>
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
                      <AddDistrictDialog onDistrictAdded={handleDistrictAdded} />
                  </CardHeader>
                  <CardContent>
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>District Name</TableHead>
                                  <TableHead className="text-right w-[140px]">Actions</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                          {districts.map((district) => (
                              <TableRow key={district.id}>
                                <TableCell className="font-medium">{district.name}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <EditDistrictDialog district={district} onDistrictUpdated={handleDistrictUpdated} />
                                    <Button variant="destructive-outline" size="sm" onClick={() => setItemToDelete({ type: 'district', data: district })}>Delete</Button>
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
                  <AddBranchDialog districts={districts} onBranchAdded={handleBranchAdded} />
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Branch Name</TableHead>
                              <TableHead>District</TableHead>
                              <TableHead className="text-right w-[140px]">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                      {branches.map((branch) => (
                          <TableRow key={branch.id}>
                              <TableCell className="font-medium">{branch.name}</TableCell>
                              <TableCell>{districts.find(d => d.id === branch.districtId)?.name}</TableCell>
                              <TableCell className="text-right space-x-2">
                                <EditBranchDialog branch={branch} districts={districts} onBranchUpdated={handleBranchUpdated} />
                                <Button variant="destructive-outline" size="sm" onClick={() => setItemToDelete({ type: 'branch', data: branch })}>Delete</Button>
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
                  <AddDepartmentDialog onDepartmentAdded={handleDepartmentAdded} />
              </CardHeader>
              <CardContent>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Department Name</TableHead>
                              <TableHead className="text-right w-[140px]">Actions</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                      {departments.map((department) => (
                          <TableRow key={department.id}>
                              <TableCell className="font-medium">{department.name}</TableCell>
                              <TableCell className="text-right space-x-2">
                                <EditDepartmentDialog department={department} onDepartmentUpdated={handleDepartmentUpdated} />
                                <Button variant="destructive-outline" size="sm" onClick={() => setItemToDelete({ type: 'department', data: department })}>Delete</Button>
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

       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
               {' '}<span className="font-semibold">"{itemToDelete?.data.name}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
