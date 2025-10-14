
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { CertificateClient } from "./certificate-client";

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

    if (!template || !course || !user) {
        notFound();
    }
    
    return (
        <CertificateClient 
            template={template}
            course={course}
            user={user}
        />
    )
}
