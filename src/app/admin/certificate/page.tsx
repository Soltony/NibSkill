
import prisma from "@/lib/db";
import { CertificateForm } from "./certificate-form";

async function getCertificateTemplate() {
    let template = await prisma.certificateTemplate.findUnique({
        where: { id: 'singleton' },
    });

    if (!template) {
        template = await prisma.certificateTemplate.create({
            data: {
                id: 'singleton',
                title: "Certificate of Completion",
                organization: "SkillUp Inc.",
                body: "This certificate is proudly presented to [Student Name] for successfully completing the [Course Name] course on [Completion Date].",
                signatoryName: "Jane Doe",
                signatoryTitle: "Head of Training & Development",
            }
        });
    }
    return template;
}


export default async function CertificatePage() {
  const template = await getCertificateTemplate();

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
