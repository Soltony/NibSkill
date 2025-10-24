
"use client"

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Target, CheckCircle, Download, TrendingUp, TrendingDown, HelpCircle, ArrowRight, Loader2, UserCheck, Medal } from "lucide-react"
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"
import { generateProgressReportCsv } from "@/app/actions/analytics-actions";
import { useToast } from "@/hooks/use-toast";

const rankIcons = [
    <Medal key="gold" className="h-6 w-6 text-yellow-500" />,
    <Medal key="silver" className="h-6 w-6 text-slate-400" />,
    <Medal key="bronze" className="h-6 w-6 text-amber-700" />,
];

type AnalyticsData = {
    kpis: {
        totalUsers: number;
        avgCompletionRate: number;
        avgScore: number;
    };
    leaderboard: {
        id: string;
        name: string;
        avatarUrl: string | null;
        coursesCompleted: number;
        department: string;
    }[];
    courseEngagement: {
        mostCompleted: { id: string; title: string; completionRate: number; }[];
        leastCompleted: { id: string; title: string; completionRate: number; }[];
    };
    scoresDistribution: { range: string; count: number; }[];
    completionByDept: { department: string; completionRate: number; }[];
}

export function AnalyticsDashboard({ analyticsData }: { analyticsData: AnalyticsData }) {
  const { kpis, completionByDept, scoresDistribution, leaderboard, courseEngagement } = analyticsData
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
        const csvData = await generateProgressReportCsv();

        if (csvData) {
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'progress_report.csv');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({
                title: "Report Generated",
                description: "Your progress report has been downloaded.",
            });
        } else {
             throw new Error("No data returned from server.");
        }
    } catch (error) {
        console.error("Failed to generate report:", error);
        toast({
            title: "Error Generating Report",
            description: "Could not generate the CSV report. Please try again later.",
            variant: "destructive",
        });
    } finally {
        setIsGenerating(false);
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <p className="text-muted-foreground">
              High-level insights into your team's learning and development.
            </p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? "Generating..." : "Download Course Progress"}
        </Button>
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
                            <AvatarImage src={user.avatarUrl ?? undefined} alt={user.name} />
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
      
       <div className="grid gap-4 md:grid-cols-2">
         <Link href="/admin/analytics/progress-report">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>Detailed Progress Report</CardTitle>
                      <CardDescription>
                          Drill down into course progress for every staff member.
                      </CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
          <Link href="/admin/analytics/attendance-report">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle>Live Session Attendance</CardTitle>
                      <CardDescription>
                          View and export attendance records for all live sessions.
                      </CardDescription>
                  </div>
                   <UserCheck className="h-8 w-8 text-muted-foreground" />
              </CardHeader>
            </Card>
          </Link>
       </div>
      
        <AnalyticsCharts 
            completionByDept={completionByDept} 
            scoresDistribution={scoresDistribution}
        />
    </div>
  )
}
