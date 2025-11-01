
"use client"

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CertificateTemplate, Course } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoveLeft, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type CertificateClientProps = {
    template: CertificateTemplate;
    course: Course;
    user: { id: string, name: string };
    completionDate: Date;
}

export function CertificateClient({ template, course, user, completionDate }: CertificateClientProps) {
    const certificateRef = useRef<HTMLDivElement>(null);

    const handleDownload = () => {
        const input = certificateRef.current;
        if (!input) return;

        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            // A4 dimensions in mm: 210 x 297
            // Certificate is aspect-[11/8.5] which is landscape
            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`NIB_Certificate_${course.title.replace(/ /g, '_')}.pdf`);
        });
    };

    const certificateBody = template.body
        .replace('[Student Name]', user.name)
        .replace('[Course Name]', course.title)
        .replace('[Completion Date]', completionDate.toLocaleDateString());
    
    const certificateStyle = {
      '--cert-primary': template.primaryColor,
      borderStyle: template.borderStyle,
    } as React.CSSProperties;
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between print-hidden">
                <div>
                    <Button asChild variant="outline" size="sm" className="mb-4">
                        <Link href={`/courses/${course.id}`}>
                            <MoveLeft className="mr-2 h-4 w-4" />
                            Back to Course
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline">Your Certificate</h1>
                    <p className="text-muted-foreground">
                    Congratulations on completing the course! Here is your official certificate.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                    </Button>
                    <Button variant="outline" onClick={() => window.print()}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print
                    </Button>
                </div>
            </div>

            <div ref={certificateRef}>
                <Card 
                  className={cn(
                    "aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-between text-center bg-white shadow-2xl relative overflow-hidden print:shadow-none print:border",
                    template.templateStyle === "Classic" && "font-serif",
                    template.templateStyle === "Formal" && "font-sans"
                  )}
                  style={certificateStyle}
                >
                    <div 
                      className="absolute inset-0 border-4 m-2 rounded-lg"
                      style={{ borderColor: template.primaryColor || undefined, opacity: 0.2 }}
                    />
                    <div
                      className="absolute inset-0 border-8 m-4 rounded-lg"
                      style={{ borderColor: template.primaryColor || undefined, opacity: 0.8, borderStyle: template.borderStyle || 'solid' }}
                    />
                    
                    <div className="z-10 flex items-center justify-center gap-4 h-16">
                        {template.logoUrl && (
                            <div className="relative h-16 w-16">
                                <Image src={template.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" />
                            </div>
                        )}
                        <h2 
                            className="text-2xl font-bold font-headline"
                            style={{ color: template.primaryColor || undefined }}
                        >
                            {template.organization}
                        </h2>
                    </div>
                    
                    <div className="z-10">
                      <h1 
                          className={cn(
                              "font-bold mb-4",
                              template.templateStyle === "Classic" ? "text-5xl" : "text-4xl",
                              template.templateStyle === "Formal" ? "text-6xl tracking-widest uppercase" : "font-headline"
                          )}
                          style={{ color: template.primaryColor || undefined }}
                        >
                          {template.title}
                        </h1>
                        <p className={cn(
                          "max-w-xl mx-auto",
                          template.templateStyle === "Formal" ? "text-base" : "text-lg text-foreground/80"
                        )}>
                            {certificateBody}
                        </p>
                    </div>

                    <div className="z-10 w-full flex justify-around items-end">
                        <div className="text-center">
                                {template.signatureUrl ? (
                                <div className="relative h-16 w-48 mx-auto mb-2">
                                    <Image src={template.signatureUrl} alt="Signature" layout="fill" objectFit="contain" />
                                </div>
                            ) : (
                                <div className="h-16"></div>
                            )}
                            <p className={cn("text-xl", template.templateStyle === "Formal" ? "font-sans" : "font-serif italic")}>{template.signatoryName}</p>
                            <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                            <p className="text-sm text-muted-foreground">{template.signatoryTitle}</p>
                        </div>
                        {template.stampUrl && (
                            <div className="relative h-24 w-24">
                                <Image src={template.stampUrl} alt="Organization Stamp" layout="fill" objectFit="contain" />
                            </div>
                        )}
                            <div className="text-center">
                            <div className="h-16"></div>
                            <p className={cn("text-xl", template.templateStyle === "Formal" ? "font-sans" : "font-serif italic")}>{completionDate.toLocaleDateString()}</p>
                            <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                            <p className="text-sm text-muted-foreground">Date of Issue</p>
                        </div>
                    </div>
                </Card>
            </div>
            <style jsx global>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                    div[data-sidebar="sidebar"], header {
                        display: none !important;
                    }
                    .print-hidden {
                        display: none;
                    }
                    @page {
                        size: A4 landscape;
                        margin: 0;
                    }
                }
            `}</style>
        </div>
    )
}
