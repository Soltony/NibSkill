
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { LiveSession, User, Department, District, Branch, UserAttendedLiveSession } from '@prisma/client';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';

const ITEMS_PER_PAGE = 15;

type UserWithRelations = User & {
    department: Department | null;
    district: District | null;
    branch: Branch | null;
}

type Attendee = UserAttendedLiveSession & { user: UserWithRelations };
type SessionWithAttendees = LiveSession & { attendedBy: Attendee[] };


type ReportDataItem = {
    sessionId: string;
    sessionTitle: string;
    sessionDate: Date;
    userId: string;
    userName: string;
    userEmail: string;
    department: string;
    district: string;
    branch: string;
    attendedAt: Date;
}

type AttendanceReportClientProps = {
    sessions: SessionWithAttendees[];
    users: User[];
    departments: Department[];
    districts: District[];
    branches: Branch[];
}

export function AttendanceReportClient({ 
    sessions,
    users,
    departments,
    districts,
    branches
}: AttendanceReportClientProps) {
  
  const [sessionFilter, setSessionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGeneratingCsv, setIsGeneratingCsv] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const reportData: ReportDataItem[] = useMemo(() => {
    return sessions.flatMap(session => 
      session.attendedBy.map(attendee => ({
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDate: session.dateTime,
        userId: attendee.userId,
        userName: attendee.user.name,
        userEmail: attendee.user.email,
        department: attendee.user.department?.name || 'N/A',
        district: attendee.user.district?.name || 'N/A',
        branch: attendee.user.branch?.name || 'N/A',
        attendedAt: attendee.attendedAt,
      }))
    );
  }, [sessions]);


  const filteredReport = useMemo(() => {
    return reportData.filter(item => {
        const sessionMatch = sessionFilter === 'all' || item.sessionId === sessionFilter;
        const userMatch = userFilter === 'all' || item.userId === userFilter;
        const departmentMatch = departmentFilter === 'all' || item.department === departmentFilter;
        const districtMatch = districtFilter === 'all' || item.district === districtFilter;
        const branchMatch = branchFilter === 'all' || item.branch === branchFilter;
        return sessionMatch && userMatch && departmentMatch && districtMatch && branchMatch;
    });
  }, [reportData, sessionFilter, userFilter, departmentFilter, districtFilter, branchFilter]);
  
  const totalPages = Math.ceil(filteredReport.length / ITEMS_PER_PAGE);
  const paginatedReport = filteredReport.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [sessionFilter, userFilter, departmentFilter, districtFilter, branchFilter]);


  const resetFilters = () => {
    setSessionFilter('all');
    setUserFilter('all');
    setDepartmentFilter('all');
    setDistrictFilter('all');
    setBranchFilter('all');
  }

  const handleDownloadCsv = () => {
    setIsGeneratingCsv(true);
    const headers = ['Session', 'Session Date', 'Staff Member', 'Email', 'Department', 'District', 'Branch', 'Attended At'];
    const csvRows = [
        headers.join(','),
        ...filteredReport.map(item => [
            `"${item.sessionTitle}"`,
            `"${format(item.sessionDate, 'yyyy-MM-dd HH:mm')}"`,
            `"${item.userName}"`,
            `"${item.userEmail}"`,
            `"${item.department}"`,
            `"${item.district}"`,
            `"${item.branch}"`,
            `"${format(item.attendedAt, 'yyyy-MM-dd HH:mm')}"`,
        ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'attendance_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsGeneratingCsv(false);
  }

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    const doc = new jsPDF({ orientation: 'landscape' });
    
    doc.setFontSize(18);
    doc.text("Live Session Attendance Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);

    const tableColumn = ["Session", "Date", "Staff", "Email", "Dept", "District", "Branch", "Time"];
    const tableRows: (string|number)[][] = [];

    filteredReport.forEach(item => {
        const row = [
            item.sessionTitle,
            format(item.sessionDate, 'yyyy-MM-dd'),
            item.userName,
            item.userEmail,
            item.department,
            item.district,
            item.branch,
            format(item.attendedAt, 'HH:mm'),
        ];
        tableRows.push(row);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 30,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [25, 62, 33] }
    });

    doc.save('attendance_report.pdf');
    setIsGeneratingPdf(false);
  }

  return (
    <div className="space-y-8">
       <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Attendance Report</CardTitle>
              <CardDescription>
                Filterable report of live session attendance.
              </CardDescription>
            </div>
            <div className="flex gap-2">
                <Button onClick={handleDownloadCsv} disabled={isGeneratingCsv}>
                    {isGeneratingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                    {isGeneratingCsv ? "..." : "CSV"}
                </Button>
                <Button onClick={handleDownloadPdf} disabled={isGeneratingPdf} variant="outline">
                    {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {isGeneratingPdf ? "..." : "PDF"}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Select value={sessionFilter} onValueChange={setSessionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by Staff" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Staff</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
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
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
             <Button variant="ghost" onClick={resetFilters} className="lg:col-start-4">Reset Filters</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Staff Member</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>District</TableHead>
                <TableHead>Attended At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedReport.length > 0 ? paginatedReport.map((item, index) => (
                <TableRow key={`${item.sessionId}-${item.userId}-${index}`}>
                  <TableCell className="font-medium">{item.sessionTitle}</TableCell>
                  <TableCell>{item.userName}</TableCell>
                  <TableCell>{item.department}</TableCell>
                  <TableCell>{item.district}</TableCell>
                  <TableCell>{format(item.attendedAt, 'yyyy-MM-dd HH:mm')}</TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                        No attendance records match your filters.
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
