
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Award, BookOpenCheck, CheckCircle, Footprints, Target, Trophy, FileText, BadgeCheck, BadgeX } from "lucide-react"
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { updateUserProfile, logout } from "@/app/actions/user-actions"

import type { User, Badge, UserBadge, UserCompletedCourse, Course, Department, Quiz } from "@prisma/client"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"


type CompletedCourse = UserCompletedCourse & { course: Course & { quiz: Quiz | null } }
type UserWithDepartment = User & { department: Department | null }
type EarnedBadge = UserBadge & { badge: Badge }

const profileFormSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    email: z.string().email("Invalid email address."),
    phoneNumber: z.string().optional(),
})

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

type ProfileTabsProps = {
    user: UserWithDepartment;
    completedCourses: CompletedCourse[];
    userBadges: EarnedBadge[];
}

export function ProfileTabs({ user, completedCourses, userBadges }: ProfileTabsProps) {
    const { toast } = useToast();
    const coursesCompletedCount = completedCourses.filter(c => c.course.quiz && c.score >= c.course.quiz.passingScore).length;
    
    const attempts = completedCourses.length;
    const avgScore = attempts > 0
        ? Math.round(
            completedCourses.reduce((acc, c) => acc + c.score, 0) /
            attempts
        )
        : 0;
        
    const form = useForm<z.infer<typeof profileFormSchema>>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: user.name,
            email: user.email,
            phoneNumber: user.phoneNumber || "",
        }
    });
    
    const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
        const result = await updateUserProfile(values);
        if (result.success) {
            toast({
                title: "Profile Updated",
                description: "Your profile information has been successfully updated.",
            })
        } else {
            toast({
                title: "Error",
                description: result.message,
                variant: "destructive",
            })
        }
    }


    return (
        <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Profile Overview</TabsTrigger>
                <TabsTrigger value="history">My Learning History</TabsTrigger>
                <TabsTrigger value="edit">Edit Profile</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-6 space-y-6">
                 <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Courses Passed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{coursesCompletedCount}</div>
                        <p className="text-xs text-muted-foreground">Total courses successfully passed.</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{avgScore}%</div>
                        <p className="text-xs text-muted-foreground">Across all attempts.</p>
                    </CardContent>
                    </Card>
                    <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
                        <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userBadges.length}</div>
                        <p className="text-xs text-muted-foreground">Total unique achievements.</p>
                    </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader>
                    <CardTitle>My Badges</CardTitle>
                    <CardDescription>
                        A collection of all the badges you've earned on your learning journey.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    {userBadges.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {userBadges.map(userBadge => (
                                <BadgeCard key={userBadge.badgeId} badge={userBadge.badge} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>No badges earned yet. Keep learning to collect them!</p>
                        </div>
                    )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="history" className="mt-6 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>My Assessment History</CardTitle>
                        <CardDescription>A record of all your quiz attempts, including passes and fails.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Date of Attempt</TableHead>
                                    <TableHead className="text-center">Score</TableHead>
                                    <TableHead className="text-center">Result</TableHead>
                                    <TableHead className="text-right">Certificate</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {completedCourses.length > 0 ? completedCourses.map(c => {
                                    const passed = c.course.quiz ? c.score >= c.course.quiz.passingScore : false;
                                    return (
                                        <TableRow key={c.courseId + c.completionDate.toISOString()}>
                                            <TableCell className="font-medium">{c.course.title}</TableCell>
                                            <TableCell>{new Date(c.completionDate).toLocaleDateString()}</TableCell>
                                            <TableCell className={cn("text-center font-semibold", passed ? "text-green-600" : "text-destructive")}>{c.score}%</TableCell>
                                            <TableCell className="text-center">
                                                {passed ? (
                                                    <span className="flex items-center justify-center gap-1 text-green-600"><BadgeCheck className="h-4 w-4" /> Passed</span>
                                                ) : (
                                                    <span className="flex items-center justify-center gap-1 text-destructive"><BadgeX className="h-4 w-4" /> Failed</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {c.course.hasCertificate && passed ? (
                                                    <Button asChild variant="link">
                                                        <Link href={`/courses/${c.courseId}/certificate`}>View</Link>
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">N/A</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            You haven't attempted any quizzes yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="edit" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Your Profile</CardTitle>
                        <CardDescription>
                            Update your personal information below. 
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
                                <FormField 
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField 
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email Address</FormLabel>
                                            <FormControl>
                                                <Input type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField 
                                    control={form.control}
                                    name="phoneNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number (Optional)</FormLabel>
                                            <FormControl>
                                                <Input {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
                                </Button>
                            </form>
                        </Form>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    )
}
