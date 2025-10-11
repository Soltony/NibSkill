
"use client"

import { useState, useMemo, useEffect } from 'react';
import { analyticsData, departments, districts, branches, courses as allCourses } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Users, Target, CheckCircle, Download, TrendingUp, TrendingDown, Award, Medal, HelpCircle, Search } from "lucide-react"
import { AnalyticsCharts } from "@/components/analytics-charts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FeatureNotImplementedDialog } from "@/components/feature-not-implemented-dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const rankIcons = [
    <Medal key="gold" className="h-6 w-6 text-yellow-500" />,
    <Medal key="silver" className="h-6 w-6 text-slate-400" />,
    <Medal key="bronze" className="h-6 w-6 text-amber-700" />,
];

const ITEMS_PER_PAGE = 10;

export default function AnalyticsPage() {
  const { kpis, completionByDept, scoresDistribution, leaderboard, courseEngagement, quizQuestionAnalysis, detailedProgressReport } = analyticsData
  
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [districtFilter, setDistrictFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredReport = useMemo(() => {
    return detailedProgressReport.filter(item => {
        const departmentMatch = departmentFilter === 'all' || item.department === departmentFilter;
        const districtMatch = districtFilter === 'all' || item.district === districtFilter;
        const branchMatch = branchFilter === 'all' || item.branch === branchFilter;
        const courseMatch = courseFilter === 'all' || item.courseId === courseFilter;
        const searchMatch = searchTerm === '' || 
                            item.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            item.courseTitle.toLowerCase().includes(searchTerm.toLowerCase());
        return departmentMatch && districtMatch && branchMatch && courseMatch && searchMatch;
    });
  }, [detailedProgressReport, departmentFilter, districtFilter, branchFilter, courseFilter, searchTerm]);
  
  const totalPages = Math.ceil(filteredReport.length / ITEMS_PER_PAGE);
  const paginatedReport = filteredReport.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    // Reset to first page whenever filters change
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
    if (districtFilter === 'all') return branches;
    const district = districts.find(d => d.name === districtFilter);
    return branches.filter(b => b.districtId === district?.id);
  }, [districtFilter]);
  
  const isBranchFilterDisabled = availableBranches.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold font-headline">Analytics Dashboard</h1>
            <p className="text-muted-foreground">
              Insights into your team's learning and development progress.
            </p>
        </div>
        <FeatureNotImplementedDialog
            title="Generate Report"
            description="In a full application, this would generate a comprehensive CSV report of all analytics data for offline analysis and distribution to department heads."
            triggerText="Download Report"
            triggerIcon={<Download className="mr-2 h-4 w-4" />}
        />
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Currently enrolled in training</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">Across all courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Assessment Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.avgScore}%</div>
            <p className="text-xs text-muted-foreground">On first attempt</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Staff Leaderboard</CardTitle>
            <CardDescription>Top performers based on courses completed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-center">Courses Completed</TableHead>
                  <TableHead>Department</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-center">
                        <div className="flex justify-center items-center">
                            {index < 3 ? rankIcons[index] : index + 1}
                        </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{user.coursesCompleted}</TableCell>
                    <TableCell>{user.department}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Most Completed Courses
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                       {courseEngagement.mostCompleted.map(course => (
                         <li key={course.id} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{course.title}</span>
                            <Badge variant="secondary">{course.completionRate}%</Badge>
                         </li>
                       ))}
                    </ul>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <TrendingDown className="h-5 w-5 text-red-500" />
                        Least Completed Courses
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                       {courseEngagement.leastCompleted.map(course => (
                         <li key={course.id} className="flex justify-between items-center text-sm">
                            <span className="font-medium">{course.title}</span>
                            <Badge variant="outline">{course.completionRate}%</Badge>
                         </li>
                       ))}
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>Detailed Progress Report</CardTitle>
          <CardDescription>
            Filterable report of course progress for every staff member.
          </CardDescription>
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
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-6 w-6 text-primary" />
                Quiz Question Analysis
            </CardTitle>
            <CardDescription>
                Identify which questions are most challenging for your staff.
            </CardDescription>
        </CardHeader>
        <CardContent>
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Question</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead className="w-[250px]">Correct Answer Rate</TableHead>
                        <TableHead className="text-right">Total Attempts</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {quizQuestionAnalysis.map((item) => {
                        const total = item.correctAttempts + item.incorrectAttempts;
                        const correctRate = total > 0 ? (item.correctAttempts / total) * 100 : 0;
                        return (
                            <TableRow key={item.questionId}>
                                <TableCell className="font-medium max-w-sm truncate">{item.questionText}</TableCell>
                                <TableCell>{item.courseTitle}</TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Progress value={correctRate} className="h-2"/>
                                        <span className="text-muted-foreground font-mono text-sm">{correctRate.toFixed(1)}%</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right font-mono">{total}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
             </Table>
        </CardContent>
      </Card>


      <AnalyticsCharts 
        completionByDept={completionByDept} 
        scoresDistribution={scoresDistribution}
      />
    </div>
  )
}
