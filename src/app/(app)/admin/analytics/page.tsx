import { analyticsData } from "@/lib/data"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Target, CheckCircle } from "lucide-react"
import { AnalyticsCharts } from "@/components/analytics-charts"

export default function AnalyticsPage() {
  const { kpis, completionByDept, scoresDistribution } = analyticsData

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Insights into your team's learning and development progress.
        </p>
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

      <AnalyticsCharts 
        completionByDept={completionByDept} 
        scoresDistribution={scoresDistribution}
      />
    </div>
  )
}
