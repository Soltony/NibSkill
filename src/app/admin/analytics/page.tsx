
"use client"

import Link from "next/link";
import { analyticsData } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Target, CheckCircle, Download, TrendingUp, TrendingDown, HelpCircle, ArrowRight } from "lucide-react"
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
import { Medal } from "lucide-react"

const rankIcons = [
    <Medal key="gold" className="h-6 w-6 text-yellow-500" />,
    <Medal key="silver" className="h-6 w-6 text-slate-400" />,
    <Medal key="bronze" className="h-6 w-6 text-amber-700" />,
];

export default function AnalyticsPage() {
  const { kpis, completionByDept, scoresDistribution, leaderboard, courseEngagement, quizQuestionAnalysis } = analyticsData
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <p className="text-muted-foreground">
              High-level insights into your team's learning and development.
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
      
       <Link href="/admin/analytics/progress-report">
          <Card className="hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Detailed Progress Report</CardTitle>
                    <CardDescription>
                        Drill down into course progress for every staff member with advanced filters and search.
                    </CardDescription>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      
        <AnalyticsCharts 
            completionByDept={completionByDept} 
            scoresDistribution={scoresDistribution}
        />
        
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

    </div>
  )
}
