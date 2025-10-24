
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import { CertificateClient } from "./certificate-client";
import { getSession } from "@/lib/auth";

async function getCertificateData(courseId: string, user: { id: string, name: string }) {

    const course = await prisma.course.findUnique({
        where: { id: courseId },
    });

    if (!course || !course.trainingProviderId) {
        return { template: null, course: null, completionDate: null };
    }

    const template = await prisma.certificateTemplate.findUnique({
        where: { trainingProviderId: course.trainingProviderId },
    });
    
    // Check if this specific user has completed this course
    const completionRecord = await prisma.userCompletedCourse.findFirst({
        where: {
            userId: user.id,
            courseId: courseId
        }
    });

    if (!completionRecord) {
        return { template: null, course: null, completionDate: null };
    }

    return { template, course, completionDate: completionRecord.completionDate };
}


export default async function UserCertificatePage({ params }: { params: { courseId: string } }) {
    const user = await getSession();
    if (!user) {
        notFound();
    }
    const { courseId } = params;
    const { template, course, completionDate } = await getCertificateData(courseId, user);

    if (!template || !course || !completionDate) {
        notFound();
    }
    
    return (
        <CertificateClient 
            template={template}
            course={course}
            user={user}
            completionDate={completionDate}
        />
    )
}
