
import prisma from "@/lib/db";
import { CertificateForm } from "./certificate-form";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getCertificateTemplate(trainingProviderId: string | null | undefined, userRole: string) {
    if (userRole !== 'Super Admin' && !trainingProviderId) {
        return null;
    }
    
    // Super Admins will see the template for the first available provider as an example.
    // In a real multi-tenant system, this might need a different approach.
    const providerIdToUse = userRole === 'Super Admin' 
        ? (await prisma.trainingProvider.findFirst({ orderBy: { createdAt: 'asc' } }))?.id
        : trainingProviderId;

    if (!providerIdToUse) {
        return null; // No providers in the system yet.
    }

    let template = await prisma.certificateTemplate.findUnique({
        where: { trainingProviderId: providerIdToUse },
    });

    if (!template) {
        const provider = await prisma.trainingProvider.findUnique({ where: { id: providerIdToUse } });
        template = await prisma.certificateTemplate.upsert({
            where: { trainingProviderId: providerIdToUse },
            update: {},
            create: {
                title: "Certificate of Completion",
                organization: provider?.name ?? "SkillUp Inc.",
                body: "This certificate is proudly presented to [Student Name] for successfully completing the [Course Name] course on [Completion Date].",
                signatoryName: "Jane Doe",
                signatoryTitle: "Head of Training & Development",
                trainingProviderId: providerIdToUse,
                primaryColor: "#4a6e3a",
                borderStyle: "solid",
                templateStyle: "Modern",
                logoUrl: null,
            }
        });
    }
    return template;
}


export default async function CertificatePage() {
  const session = await getSession();
  if (!session?.id) {
      notFound();
  }
  
  const template = await getCertificateTemplate(session.trainingProviderId, session.role.name);

  if (!template) {
      return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline">Certificate Template</h1>
                <p className="text-muted-foreground">
                    Design the certificate that will be awarded upon course completion.
                </p>
            </div>
            <p className="text-muted-foreground text-center py-12">
                No training providers have been set up yet. A certificate template can be configured once a provider exists.
            </p>
        </div>
      )
  }

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
