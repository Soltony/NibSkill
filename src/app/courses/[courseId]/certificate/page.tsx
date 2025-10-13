
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import {
  Card
} from "@/components/ui/card";
import { MoveLeft, Download } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

async function getCertificateData(courseId: string) {
    const template = await prisma.certificateTemplate.findUnique({
        where: { id: 'singleton' },
    });

    const course = await prisma.course.findUnique({
        where: { id: courseId },
    });

    // In a real app, you'd get the currently logged-in user.
    // For this prototype, we'll get the first staff user.
    const user = await prisma.user.findFirst({
        where: { role: { name: 'Staff' } },
    });

    return { template, course, user };
}


export default async function UserCertificatePage({ params }: { params: { courseId: string }}) {
    const { template, course, user } = await getCertificateData(params.courseId);

    if (!course || !user) {
        notFound();
    }
    
    // Fallback to a default template if none is in the DB
    const displayTemplate = template || {
        title: "Certificate of Completion",
        organization: "SkillUp Inc.",
        body: "This certificate is proudly presented to [Student Name] for successfully completing the [Course Name] course on [Completion Date].",
        signatoryName: "Jane Doe",
        signatoryTitle: "Head of Training & Development",
        signatureUrl: null,
        stampUrl: null,
    };

    const certificateBody = displayTemplate.body
        .replace('[Student Name]', user.name)
        .replace('[Course Name]', course.title)
        .replace('[Completion Date]', new Date().toLocaleDateString());

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <div>
                 <Button asChild variant="outline" size="sm" className="mb-4">
                    <Link href={`/courses/${params.courseId}`}>
                        <MoveLeft className="mr-2 h-4 w-4" />
                        Back to Course
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold font-headline">Your Certificate</h1>
                <p className="text-muted-foreground">
                Congratulations on completing the course! Here is your official certificate.
                </p>
            </div>
             <Button onClick={() => {
                // This is a client-side action. In a real app, this might be handled by a client component.
                if (typeof window !== 'undefined') window.print();
             }}>
                <Download className="mr-2 h-4 w-4" />
                Download
            </Button>
        </div>

        <Card className="aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-between text-center bg-white shadow-2xl relative overflow-hidden print:shadow-none print:border">
            <div className="absolute inset-0 border-4 border-primary/20 m-2 rounded-lg print:border-primary/80"></div>
            <div className="absolute inset-0 border-8 border-primary/80 m-4 rounded-lg print:border-primary"></div>
            
            <div className="z-10 w-full">
                <div className="flex justify-center items-center gap-4 mb-4">
                    <Logo />
                </div>
                <p className="text-xl font-semibold text-muted-foreground">{displayTemplate.organization}</p>
            </div>
            
            <div className="z-10">
                <h1 className="text-5xl font-bold font-headline text-primary mb-4">{displayTemplate.title}</h1>
                <p className="text-lg text-foreground/80 max-w-xl mx-auto">
                    {certificateBody}
                </p>
            </div>

            <div className="z-10 w-full flex justify-around items-end">
                <div className="text-center">
                        {displayTemplate.signatureUrl ? (
                        <div className="relative h-16 w-48 mx-auto mb-2">
                            <Image src={displayTemplate.signatureUrl} alt="Signature" layout="fill" objectFit="contain" />
                        </div>
                    ) : (
                        <div className="h-16"></div>
                    )}
                    <p className="font-serif text-xl italic">{displayTemplate.signatoryName}</p>
                    <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                    <p className="text-sm text-muted-foreground">{displayTemplate.signatoryTitle}</p>
                </div>
                {displayTemplate.stampUrl && (
                    <div className="relative h-24 w-24">
                        <Image src={displayTemplate.stampUrl} alt="Organization Stamp" layout="fill" objectFit="contain" />
                    </div>
                )}
                    <div className="text-center">
                    <div className="h-16"></div>
                    <p className="font-serif text-xl italic">{new Date().toLocaleDateString()}</p>
                    <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                    <p className="text-sm text-muted-foreground">Date of Issue</p>
                </div>
            </div>
        </Card>
        <style jsx global>{`
            @media print {
                body > div > div > div:first-child {
                     display: none;
                }
                body > div > div > main {
                    padding: 0;
                    margin: 0;
                }
                .print-hidden {
                    display: none;
                }
                .print-shadow-none {
                    box-shadow: none !important;
                }
                 .print\\:border {
                    border-width: 1px !important;
                }
            }
        `}</style>
    </div>
  );
}
