"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

interface AnalyticsChartsProps {
    completionByDept: { department: string; completionRate: number }[];
    scoresDistribution: { range: string; count: number }[];
}

const completionChartConfig = {
  completionRate: {
    label: "Completion Rate",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const scoresChartConfig = {
  count: {
    label: "Staff Count",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig


export function AnalyticsCharts({ completionByDept, scoresDistribution }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Course Completion by Department</CardTitle>
          <CardDescription>Average course completion rate across different departments.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={completionChartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={completionByDept} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="department"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis unit="%" />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dashed" />}
                />
                <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Assessment Scores Distribution</CardTitle>
          <CardDescription>Distribution of staff scores in quizzes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={scoresChartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoresDistribution} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="range"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    />
                    <YAxis />
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
