
"use client"

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import type { CertificateTemplate, Course, LearningPath } from "@prisma/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoveLeft, Download, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type CertificateClientProps = {
    template: CertificateTemplate;
    item: Course | LearningPath;
    itemType: 'course' | 'path';
    user: { id: string, name: string };
    completionDate: Date;
}

export function CertificateClient({ template, item, itemType, user, completionDate }: CertificateClientProps) {
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
            pdf.save(`NIB_Certificate_${item.title.replace(/ /g, '_')}.pdf`);
        });
    };

    const certificateBody = template.body
        .replace(/\[Student Name\]/g, user.name)
        .replace(/\[(Course|Learning Path) Name\]/g, item.title)
        .replace(/\[Completion Date\]/g, completionDate.toLocaleDateString());
    
    const certificateStyle = {
      '--cert-primary': template.primaryColor,
      borderStyle: template.borderStyle || 'solid',
    } as React.CSSProperties;

    const backLink = itemType === 'course' ? `/courses/${item.id}` : `/learning-paths/${item.id}`;
    
    const renderPreview = () => {
        const bodyContent = (
            <p className="max-w-xl mx-auto text-base text-foreground/70">
                {certificateBody}
            </p>
        );

        const signatureBlock = (
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
        );

        const dateBlock = (
             <div className="text-center">
                <div className="h-16"></div>
                <p className={cn("text-xl", template.templateStyle === "Formal" ? "font-sans" : "font-serif italic")}>{completionDate.toLocaleDateString()}</p>
                <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                <p className="text-sm text-muted-foreground">Date of Issue</p>
            </div>
        );

        switch (template.templateStyle) {
          case "Classic":
            return (
              <Card
                className="aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-center text-center bg-white shadow-2xl relative overflow-hidden font-serif"
                style={certificateStyle}
              >
                <div 
                  className="absolute inset-0 border m-2 rounded-lg"
                  style={{ borderColor: template.primaryColor || undefined, opacity: 0.3 }}
                />
                <div
                  className="absolute inset-0 border-2 m-4 rounded-lg"
                  style={{ borderColor: template.primaryColor || undefined, opacity: 0.8, borderStyle: 'double', borderWidth: '4px' }}
                />
                <div className="z-10 flex flex-col items-center justify-center gap-2 mb-8">
                  {template.logoUrl && (
                    <div className="relative h-20 w-20">
                      <Image src={template.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" />
                    </div>
                  )}
                  <h2 className="text-3xl font-bold" style={{ color: template.primaryColor || undefined }}>{template.organization}</h2>
                </div>
                <div className="z-10 text-center">
                  <p className="text-lg text-foreground/80 mb-2">This certifies that</p>
                  <h1 className="text-5xl font-bold font-headline mb-4" style={{ color: template.primaryColor || undefined }}>{user.name}</h1>
                  <p className="text-lg text-foreground/80 mb-2">has successfully completed the</p>
                  <h3 className="text-2xl font-bold mb-6">{template.title}</h3>
                  {bodyContent}
                </div>
                <div className="z-10 w-full flex justify-around items-end mt-12 gap-8">
                  {signatureBlock}
                  <div className="text-center">
                    {template.stampUrl && <div className="relative h-24 w-24 mx-auto"><Image src={template.stampUrl} alt="Stamp" layout="fill" objectFit="contain" /></div>}
                  </div>
                  {dateBlock}
                </div>
              </Card>
            );
          case "Formal":
            return (
              <Card
                className="aspect-[11/8.5] w-full p-4 flex flex-col items-center justify-center text-center bg-white shadow-2xl relative overflow-hidden"
                style={certificateStyle}
              >
                <div 
                  className="absolute inset-0 border-8"
                  style={{ borderColor: template.primaryColor || undefined, borderImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='%23${template.primaryColor?.substring(1)}' stroke-width='16' stroke-dasharray='30%2c 10' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e") 10`}}
                />
                 <div className="z-10 flex items-center justify-center gap-4 mb-4">
                  {template.logoUrl && <div className="relative h-16 w-16"><Image src={template.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" /></div>}
                  <h2 className="text-4xl font-extrabold tracking-widest uppercase" style={{ color: template.primaryColor || undefined }}>{template.organization}</h2>
                </div>
                <div className="z-10 my-4">
                  <p className="text-xl uppercase tracking-wider">{template.title}</p>
                  <p className="text-lg mt-4">This certificate is awarded to</p>
                  <h1 className="text-5xl font-serif italic my-4">{user.name}</h1>
                  {bodyContent}
                </div>
                <div className="z-10 w-full flex justify-between items-end px-16 mt-8">
                  {signatureBlock}
                  <div className="relative h-28 w-28">
                    {template.stampUrl && <Image src={template.stampUrl} alt="Stamp" layout="fill" objectFit="contain" />}
                  </div>
                </div>
              </Card>
            )
          case "Modern":
          default:
            return (
              <Card
                className="aspect-[11/8.5] w-full p-0 flex text-left bg-white shadow-2xl relative overflow-hidden"
                style={certificateStyle}
              >
                <div className="w-1/4 h-full" style={{ backgroundColor: template.primaryColor || undefined, opacity: 0.8 }} />
                <div className="w-3/4 h-full p-12 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-4 mb-8">
                            {template.logoUrl && <div className="relative h-16 w-16"><Image src={template.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" /></div>}
                            <h2 className="text-3xl font-bold font-headline">{template.organization}</h2>
                        </div>
                        <p className="text-muted-foreground text-sm uppercase tracking-widest">{template.title}</p>
                        <p className="text-lg text-muted-foreground mt-8">Awarded to</p>
                        <p className="text-3xl font-bold">{user.name}</p>
                    </div>
                     <div className="mt-8">
                        {bodyContent}
                     </div>
                     <div className="flex justify-between items-end mt-8">
                        {signatureBlock}
                         {template.stampUrl && <div className="relative h-20 w-20"><Image src={template.stampUrl} alt="Stamp" layout="fill" objectFit="contain" /></div>}
                     </div>
                </div>
              </Card>
            );
        }
    }
    
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between print-hidden">
                <div>
                    <Button asChild variant="outline" size="sm" className="mb-4">
                        <Link href={backLink}>
                            <MoveLeft className="mr-2 h-4 w-4" />
                            Back to {itemType === 'course' ? 'Course' : 'Learning Path'}
                        </Link>
                    </Button>
                    <h1 className="text-3xl font-bold font-headline">Your Certificate</h1>
                    <p className="text-muted-foreground">
                    Congratulations on completing the {itemType === 'course' ? 'course' : 'learning path'}! Here is your official certificate.
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
                {renderPreview()}
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
