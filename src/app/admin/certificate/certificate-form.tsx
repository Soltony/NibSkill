
"use client";

import { useState, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "@/components/logo";
import Image from "next/image";
import { X } from "lucide-react";
import { updateCertificateTemplate } from "@/app/actions/certificate-actions";
import type { CertificateTemplate } from "@prisma/client";

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  organization: z.string().min(2, "Organization is required"),
  body: z.string().min(10, "Body text is required"),
  signatoryName: z.string().min(3, "Signatory name is required"),
  signatoryTitle: z.string().min(3, "Signatory title is required"),
  signatureUrl: z.string().nullable(),
  stampUrl: z.string().nullable(),
});

type CertificateTemplateForm = z.infer<typeof formSchema>;

type CertificateFormProps = {
  template: CertificateTemplate;
};

export function CertificateForm({ template }: CertificateFormProps) {
  const { toast } = useToast();
  const [signatureUrl, setSignatureUrl] = useState<string | null>(template.signatureUrl);
  const [stampUrl, setStampUrl] = useState<string | null>(template.stampUrl);

  const form = useForm<CertificateTemplateForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...template,
      signatureUrl: template.signatureUrl,
      stampUrl: template.stampUrl,
    },
  });

  const watchedValues = form.watch();

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, setter: (url: string | null) => void, fieldName: "signatureUrl" | "stampUrl") => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setter(dataUrl);
        form.setValue(fieldName, dataUrl);
        toast({
          title: "Image Uploaded",
          description: "Your image has been locally selected. Save the template to persist it.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageRemove = (setter: (url: string | null) => void, fieldName: "signatureUrl" | "stampUrl") => {
    setter(null);
    form.setValue(fieldName, null);
    toast({
      title: "Image Removed",
      description: `The ${fieldName === 'signatureUrl' ? 'signature' : 'stamp'} image has been removed locally. Save to confirm.`,
    });
  };

  const onSubmit = async (values: CertificateTemplateForm) => {
    const result = await updateCertificateTemplate(values);
    if (result.success) {
      toast({
        title: "Template Saved",
        description: "Your certificate template has been updated.",
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  const previewBody = watchedValues.body
    ?.replace('[Student Name]', 'Alex Johnson')
    .replace('[Course Name]', 'New Product Launch: FusionX')
    .replace('[Completion Date]', new Date().toLocaleDateString());

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Customize Certificate</CardTitle>
            <CardDescription>Use the form below to edit the certificate content. Placeholders like [Student Name] are supported.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Title</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Body Text</FormLabel>
                      <FormControl><Textarea {...field} rows={5} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signatoryName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signatory Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="signatoryTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Signatory Title</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormItem>
                  <FormLabel>Signatory Signature</FormLabel>
                  {signatureUrl ? (
                    <div className="flex items-center gap-2">
                      <Image src={signatureUrl} alt="Signature preview" width={100} height={40} className="border rounded-md bg-muted" />
                      <Button variant="ghost" size="sm" onClick={() => handleImageRemove(setSignatureUrl, 'signatureUrl')}>
                        <X className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <FormControl>
                      <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, setSignatureUrl, 'signatureUrl')} />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
                <FormItem>
                  <FormLabel>Organization Stamp/Seal</FormLabel>
                  {stampUrl ? (
                    <div className="flex items-center gap-2">
                      <Image src={stampUrl} alt="Stamp preview" width={60} height={60} className="border rounded-md bg-muted p-1" />
                      <Button variant="ghost" size="sm" onClick={() => handleImageRemove(setStampUrl, 'stampUrl')}>
                        <X className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <FormControl>
                      <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, setStampUrl, 'stampUrl')} />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving..." : "Save Template"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        <h2 className="text-2xl font-semibold font-headline mb-4">Live Preview</h2>
        <Card className="aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-between text-center bg-white shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 border-4 border-primary/20 m-2 rounded-lg"></div>
          <div className="absolute inset-0 border-8 border-primary/80 m-4 rounded-lg"></div>
          <div className="z-10 w-full">
            <div className="flex justify-center items-center gap-4 mb-4"><Logo /></div>
            <p className="text-xl font-semibold text-muted-foreground">{watchedValues.organization}</p>
          </div>
          <div className="z-10">
            <h1 className="text-5xl font-bold font-headline text-primary mb-4">{watchedValues.title}</h1>
            <p className="text-lg text-foreground/80 max-w-xl mx-auto">{previewBody}</p>
          </div>
          <div className="z-10 w-full flex justify-around items-end">
            <div className="text-center">
              {signatureUrl ? (
                <div className="relative h-16 w-48 mx-auto mb-2">
                  <Image src={signatureUrl} alt="Signature" layout="fill" objectFit="contain" />
                </div>
              ) : <div className="h-16"></div>}
              <p className="font-serif text-xl italic">{watchedValues.signatoryName}</p>
              <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
              <p className="text-sm text-muted-foreground">{watchedValues.signatoryTitle}</p>
            </div>
            {stampUrl && (
              <div className="relative h-24 w-24">
                <Image src={stampUrl} alt="Organization Stamp" layout="fill" objectFit="contain" />
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
      </div>
    </div>
  );
}
