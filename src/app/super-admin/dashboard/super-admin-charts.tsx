
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Area, AreaChart } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface SuperAdminChartsProps {
    registrationData: { date: string; registrations: number }[];
    providerActivityData: { provider: string; courses: number }[];
}

const registrationChartConfig = {
  registrations: {
    label: "Registrations",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const providerChartConfig = {
  courses: {
    label: "Courses",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig


export function SuperAdminCharts({ registrationData, providerActivityData }: SuperAdminChartsProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>New Registrations</CardTitle>
          <CardDescription>Chart showing new trainee registrations over the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={registrationChartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={registrationData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                <defs>
                    <linearGradient id="fillRegistrations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-registrations)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="var(--color-registrations)" stopOpacity={0.1}/>
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 6)}
                />
                <YAxis allowDecimals={false} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Area dataKey="registrations" type="natural" fill="url(#fillRegistrations)" stroke="var(--color-registrations)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Provider Activity</CardTitle>
          <CardDescription>Chart showing course creation activity by provider.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={providerChartConfig} className="min-h-[200px] w-full">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={providerActivityData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="provider"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                    />
                    <YAxis allowDecimals={false}/>
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dashed" />}
                    />
                    <Bar dataKey="courses" fill="var(--color-courses)" radius={4} />
                </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
