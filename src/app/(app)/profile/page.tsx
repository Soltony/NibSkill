
"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { users, courses as initialCourses, type User, type Badge } from "@/lib/data"
import { Award, BookOpenCheck, CalendarDays, CheckCircle, Footprints, Medal, Target, Trophy, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const badgeIcons: { [key: string]: React.ReactNode } = {
    Footprints: <Footprints className="h-10 w-10" />,
    BookOpenCheck: <BookOpenCheck className="h-10 w-10" />,
    Trophy: <Trophy className="h-10 w-10" />,
    Target: <Target className="h-10 w-10" />,
};


function BadgeCard({ badge }: { badge: Badge }) {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-transform hover:scale-105 aspect-square">
                        <div className="text-accent">{badgeIcons[badge.icon]}</div>
                        <p className="text-sm font-semibold text-center">{badge.title}</p>
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{badge.description}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

export default function ProfilePage() {
  const currentUser = users.find(u => u.role === 'staff')!
  const completedCourses = currentUser.completedCourses || [];
  const coursesCompletedCount = completedCourses.length;
  const avgScore = coursesCompletedCount > 0
    ? Math.round(
        (currentUser.completedCourses || []).reduce((acc, c) => acc + c.score, 0) /
          coursesCompletedCount
      )
    : 0
    
  const getCourseTitle = (courseId: string) => {
    return initialCourses.find(c => c.id === courseId)?.title || "Unknown Course";
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-primary">
          <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
          <AvatarFallback className="text-3xl">
            {currentUser.name.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-4xl font-bold font-headline">{currentUser.name}</h1>
          <p className="text-lg text-muted-foreground">{currentUser.department} Department</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coursesCompletedCount}</div>
            <p className="text-xs text-muted-foreground">Total courses finished.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}%</div>
            <p className="text-xs text-muted-foreground">Across all completed quizzes.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentUser.badges?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Total unique achievements.</p>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle>My Certificates</CardTitle>
          <CardDescription>
            All of the certificates you've earned from completing courses.
          </CardDescription>
        </CardHeader>
        <CardContent>
           {completedCourses.length > 0 ? (
             <ul className="space-y-4">
                {completedCourses.map(cert => (
                    <li key={cert.courseId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4">
                        <div>
                            <p className="font-semibold">{getCourseTitle(cert.courseId)}</p>
                            <p className="text-sm text-muted-foreground">Completed on: {cert.completionDate.toLocaleDateString()}</p>
                        </div>
                        <Button asChild variant="outline" className="mt-2 sm:mt-0">
                            <Link href={`/courses/${cert.courseId}/certificate`}>
                                <FileText className="mr-2 h-4 w-4" />
                                View Certificate
                            </Link>
                        </Button>
                    </li>
                ))}
             </ul>
            ) : (
             <div className="text-center py-12 text-muted-foreground">
                <p>No certificates earned yet. Complete a course to earn one!</p>
            </div>
            )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Badges</CardTitle>
          <CardDescription>
            A collection of all the badges you've earned on your learning journey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentUser.badges && currentUser.badges.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {currentUser.badges.map(badge => (
                    <BadgeCard key={badge.id} badge={badge} />
                ))}
             </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
                <p>No badges earned yet. Keep learning to collect them!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
