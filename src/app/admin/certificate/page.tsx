
import prisma from "@/lib/db";
import { CertificateForm } from "./certificate-form";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getCertificateTemplate(trainingProviderId: string) {
    let template = await prisma.certificateTemplate.findUnique({
        where: { trainingProviderId: trainingProviderId },
    });

    if (!template) {
        const provider = await prisma.trainingProvider.findUnique({ where: { id: trainingProviderId } });
        template = await prisma.certificateTemplate.create({
            data: {
                title: "Certificate of Completion",
                organization: provider?.name ?? "SkillUp Inc.",
                body: "This certificate is proudly presented to [Student Name] for successfully completing the [Course Name] course on [Completion Date].",
                signatoryName: "Jane Doe",
                signatoryTitle: "Head of Training & Development",
                trainingProviderId: trainingProviderId,
            }
        });
    }
    return template;
}


export default async function CertificatePage() {
  const session = await getSession();
  if (!session || !session.trainingProviderId) {
      notFound();
  }
  
  const template = await getCertificateTemplate(session.trainingProviderId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Certificate Template</h1>
        <p className="text-muted-foreground">
          Design the certificate that will be awarded upon course completion.
        </p>
      </div>

      <CertificateForm template={template} />
    </div>
  );
}
