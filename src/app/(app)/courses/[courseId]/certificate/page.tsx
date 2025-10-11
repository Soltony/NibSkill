
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, MoveLeft } from "lucide-react";
import { Logo } from "@/components/logo";
import { courses as initialCourses, users, type Course } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const TEMPLATE_STORAGE_KEY = "skillup-certificate-template";
const COURSES_STORAGE_KEY = "skillup-courses";

const defaultTemplate = {
  title: "Certificate of Completion",
  organization: "SkillUp Inc.",
  body: "This certificate is proudly presented to [Student Name] for successfully completing the [Course Name] course on [Completion Date].",
  signatoryName: "Jane Doe",
  signatoryTitle: "Head of Training & Development",
};

export default function UserCertificatePage() {
    const params = useParams();
    const courseId = typeof params.courseId === 'string' ? params.courseId : '';

    const [template, setTemplate] = useState(defaultTemplate);
    const [course, setCourse] = useState<Course | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    
    // For simplicity, we'll use the first 'staff' user.
    const currentUser = users.find(u => u.role === 'staff')!;


    useEffect(() => {
        const storedTemplate = localStorage.getItem(TEMPLATE_STORAGE_KEY);
        if (storedTemplate) {
            setTemplate(JSON.parse(storedTemplate));
        }

        const storedCourses = localStorage.getItem(COURSES_STORAGE_KEY);
        const allCourses = storedCourses ? JSON.parse(storedCourses) : initialCourses;
        const currentCourse = allCourses.find((c: Course) => c.id === courseId);
        setCourse(currentCourse);

        setIsLoaded(true);
    }, [courseId]);

    if (!isLoaded || !course) {
        return <div>Loading certificate...</div>;
    }
    
    const certificateBody = template.body
        .replace('[Student Name]', currentUser.name)
        .replace('[Course Name]', course.title)
        .replace('[Completion Date]', new Date().toLocaleDateString());

  return (
    <div className="space-y-8">
        <div>
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href={`/courses/${courseId}`}>
                    <MoveLeft className="mr-2 h-4 w-4" />
                    Back to Course
                </Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline">Your Certificate</h1>
            <p className="text-muted-foreground">
              Congratulations on completing the course! Here is your official certificate.
            </p>
        </div>

        <Card className="aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-between text-center bg-white shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 border-4 border-primary/20 m-2 rounded-lg"></div>
            <div className="absolute inset-0 border-8 border-primary/80 m-4 rounded-lg"></div>
            
            <div className="z-10 w-full">
                <div className="flex justify-center items-center gap-4 mb-4">
                    <Logo />
                </div>
                <p className="text-xl font-semibold text-muted-foreground">{template.organization}</p>
            </div>
            
            <div className="z-10">
                <h1 className="text-5xl font-bold font-headline text-primary mb-4">{template.title}</h1>
                <p className="text-lg text-foreground/80 max-w-xl mx-auto">
                    {certificateBody}
                </p>
            </div>

            <div className="z-10 w-full flex justify-around">
                <div className="text-center">
                    <p className="font-serif text-2xl italic">{template.signatoryName}</p>
                    <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                    <p className="text-sm text-muted-foreground">{template.signatoryTitle}</p>
                </div>
                 <div className="text-center">
                    <p className="font-serif text-2xl italic">{new Date().toLocaleDateString()}</p>
                    <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                    <p className="text-sm text-muted-foreground">Date of Issue</p>
                </div>
            </div>
        </Card>
    </div>
  );
}
