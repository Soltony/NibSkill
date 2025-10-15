
"use client"

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Search, FileDown, FileText, Loader2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Course, Department, District, Branch } from '@prisma/client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ITEMS_PER_PAGE = 10;

type ReportDataItem = {
    userId: string;
    userName: string;
    department: string;
    district: string;
    branch: string;
    courseId: string;
    courseTitle: string;
    progress: number;
}

type ProgressReportClientProps = {
    reportData: ReportDataItem[];
    allCourses: Course[];
    departments: Department[];
    districts: District[];
    allBranches: Branch[];
}

export function ProgressReportClient({ 
    reportData,
    allCourses,
    departments,
    districts,
    allBranches
}: ProgressReportClientProps) {
  
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const filteredReport = useMemo(() => {
    return reportData.filter(item => {
        const departmentMatch = departmentFilter === 'all' || item.department === departmentFilter;
        const districtMatch = districtFilter === 'all' || item.district === districtFilter;
        const branchMatch = branchFilter === 'all' || item.branch === branchFilter;
        const courseMatch = courseFilter === 'all' || item.courseId === courseFilter;
        const searchMatch = searchTerm === '' || 
                            item.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
        return departmentMatch && districtMatch && branchMatch && courseMatch && searchMatch;
    });
  }, [reportData, departmentFilter, districtFilter, branchFilter, courseFilter, searchTerm]);
  
  const totalPages = Math.ceil(filteredReport.length / ITEMS_PER_PAGE);
  const paginatedReport = filteredReport.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, districtFilter, branchFilter, courseFilter, searchTerm]);


  const resetFilters = () => {
    setDepartmentFilter('all');
    setDistrictFilter('all');
    setBranchFilter('all');
    setCourseFilter('all');
    setSearchTerm('');
  }

  const availableBranches = useMemo(() => {
    if (districtFilter === 'all') return allBranches;
    const district = districts.find(d => d.name === districtFilter);
    return allBranches.filter(b => b.districtId === district?.id);
  }, [districtFilter, districts, allBranches]);
  
  const isBranchFilterDisabled = districtFilter === 'all' || availableBranches.length === 0;

  const handleDownloadCsv = () => {
    setIsGeneratingCsv(true);
    const headers = ['Staff Member', 'Course', 'Department', 'District', 'Branch', 'Progress (%)'];
    const csvRows = [
        headers.join(','),
        ...filteredReport.map(item => [
            `"${item.userName}"`,
            `"${item.courseTitle}"`,
            `"${item.department}"`,
            `"${item.district}"`,
            `"${item.branch}"`,
            item.progress
        ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'progress_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsGeneratingCsv(false);
  }

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Detailed Progress Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const tableColumn = ["Staff", "Course", "Dept", "District", "Branch", "Progress"];
    const tableRows: (string|number)[][] = [];

    filteredReport.forEach(item => {
        const row = [
            item.userName,
            item.courseTitle,
            item.department,
            item.district,
            item.branch,
            `${item.progress}%`
        ];
        tableRows.push(row);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
    });

    doc.save('progress_report.pdf');
    setIsGeneratingPdf(false);
  }

  return (
    <div className="space-y-8">
       <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Detailed Progress Report</CardTitle>
              <CardDescription>
                Filterable report of course progress for every staff member.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleDownloadCsv} disabled={isGeneratingCsv}>
                    {isGeneratingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {isGeneratingCsv ? "Generating..." : "Download CSV"}
                </Button>
                <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf} variant="outline">
                    {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {isGeneratingPdf ? "Generating..." : "Download PDF"}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="relative col-span-full lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by staff or course..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {allCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={districtFilter} onValueChange={(value) => { setDistrictFilter(value); setBranchFilter('all'); }}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter} disabled={isBranchFilterDisabled}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                 {availableBranches.map(b => <SelectItem key={b.id} value={b.name}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
             <Button variant="ghost" onClick={resetFilters} className="lg:col-start-5">Reset Filters</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff Member</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="w-[150px]">Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReport.length > 0 ? paginatedReport.map((item, index) => (
                <TableRow key={`${item.userId}-${item.courseId}-${index}`}>
                  <TableCell className="font-medium">{item.userName}</TableCell>
                  <TableCell>{item.courseTitle}</TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>{item.district}</TableCell>
                  <TableCell>{item.branch}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={item.progress} className="h-2" />
                      <span className="text-muted-foreground font-mono text-sm">{item.progress}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No results match your filters.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredReport.length)} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredReport.length)} of {filteredReport.length} entries.
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                    Previous
                </Button>
                <span className="text-sm font-medium">{currentPage} / {totalPages > 0 ? totalPages : 1}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || totalPages === 0}>
                    Next
                </Button>
            </div>
        </CardFooter>
      </Card>
    </div>
  )
}
