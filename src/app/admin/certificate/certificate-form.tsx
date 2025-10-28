
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { X, Palette, Brush, Check } from "lucide-react";
import { updateCertificateTemplate } from "@/app/actions/certificate-actions";
import type { CertificateTemplate } from "@prisma/client";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  organization: z.string().min(2, "Organization is required"),
  body: z.string().min(10, "Body text is required"),
  logoUrl: z.string().nullable(),
  signatoryName: z.string().min(3, "Signatory name is required"),
  signatoryTitle: z.string().min(3, "Signatory title is required"),
  signatureUrl: z.string().nullable(),
  stampUrl: z.string().nullable(),
  primaryColor: z.string().optional(),
  borderStyle: z.string().optional(),
  templateStyle: z.string().optional(),
});

type CertificateTemplateForm = z.infer<typeof formSchema>;

type CertificateFormProps = {
  template: CertificateTemplate;
};

const borderStyleOptions = ["solid", "double", "dotted", "dashed"];
const templateStyleOptions = ["Modern", "Classic", "Formal"];

export function CertificateForm({ template }: CertificateFormProps) {
  const { toast } = useToast();
  const [logoUrl, setLogoUrl] = useState<string | null>(template.logoUrl);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(template.signatureUrl);
  const [stampUrl, setStampUrl] = useState<string | null>(template.stampUrl);

  const form = useForm<CertificateTemplateForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...template,
      primaryColor: template.primaryColor || '#4a6e3a',
      borderStyle: template.borderStyle || borderStyleOptions[0],
      templateStyle: template.templateStyle || templateStyleOptions[0],
      logoUrl: template.logoUrl,
      signatureUrl: template.signatureUrl,
      stampUrl: template.stampUrl,
    },
  });

  const watchedValues = form.watch();

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, setter: (url: string | null) => void, fieldName: "logoUrl" | "signatureUrl" | "stampUrl") => {
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

  const handleImageRemove = (setter: (url: string | null) => void, fieldName: "logoUrl" | "signatureUrl" | "stampUrl") => {
    setter(null);
    form.setValue(fieldName, null);
    toast({
      title: "Image Removed",
      description: `The ${fieldName === 'logoUrl' ? 'logo' : (fieldName === 'signatureUrl' ? 'signature' : 'stamp')} image has been removed locally. Save to confirm.`,
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

  const certificateStyle = {
    '--cert-primary': watchedValues.primaryColor,
    borderStyle: watchedValues.borderStyle,
  } as React.CSSProperties;
  
  const renderPreview = () => {
    switch (watchedValues.templateStyle) {
      case "Classic":
        return (
          <Card
            className="aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-center text-center bg-white shadow-2xl relative overflow-hidden font-serif"
            style={certificateStyle}
          >
            <div 
              className="absolute inset-0 border m-2 rounded-lg"
              style={{ borderColor: watchedValues.primaryColor, opacity: 0.3 }}
            />
            <div
              className="absolute inset-0 border-2 m-4 rounded-lg"
              style={{ borderColor: watchedValues.primaryColor, opacity: 0.8, borderStyle: 'double', borderWidth: '4px' }}
            />
            <div className="z-10 flex flex-col items-center justify-center gap-2 mb-8">
              {watchedValues.logoUrl && (
                <div className="relative h-20 w-20">
                  <Image src={watchedValues.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" />
                </div>
              )}
              <h2 className="text-3xl font-bold" style={{ color: watchedValues.primaryColor }}>{watchedValues.organization}</h2>
            </div>
            <div className="z-10 text-center">
              <p className="text-lg text-foreground/80 mb-2">This certifies that</p>
              <h1 className="text-5xl font-bold font-headline mb-4" style={{ color: watchedValues.primaryColor }}>Alex Johnson</h1>
              <p className="text-lg text-foreground/80 mb-2">has successfully completed the</p>
              <h3 className="text-2xl font-bold mb-6">{watchedValues.title}</h3>
              <p className="max-w-xl mx-auto text-base text-foreground/70">{previewBody}</p>
            </div>
            <div className="z-10 w-full flex justify-around items-end mt-12 gap-8">
              <div className="text-center">
                {signatureUrl && <div className="relative h-16 w-48 mx-auto mb-2"><Image src={signatureUrl} alt="Signature" layout="fill" objectFit="contain" /></div>}
                <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                <p className="text-sm text-muted-foreground mt-1">{watchedValues.signatoryName}, {watchedValues.signatoryTitle}</p>
              </div>
              <div className="text-center">
                {stampUrl && <div className="relative h-24 w-24 mx-auto"><Image src={stampUrl} alt="Stamp" layout="fill" objectFit="contain" /></div>}
              </div>
              <div className="text-center">
                <div className="h-16"></div>
                <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                <p className="text-sm text-muted-foreground mt-1">Date of Issue: {new Date().toLocaleDateString()}</p>
              </div>
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
              style={{ borderColor: watchedValues.primaryColor, borderImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='%23${watchedValues.primaryColor?.substring(1)}' stroke-width='16' stroke-dasharray='30%2c 10' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e") 10`}}
            />
             <div className="z-10 flex items-center justify-center gap-4 mb-4">
              {watchedValues.logoUrl && <div className="relative h-16 w-16"><Image src={watchedValues.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" /></div>}
              <h2 className="text-4xl font-extrabold tracking-widest uppercase" style={{ color: watchedValues.primaryColor }}>{watchedValues.organization}</h2>
            </div>
            <div className="z-10 my-4">
              <p className="text-xl uppercase tracking-wider">Certificate Of Completion</p>
              <h1 className="text-6xl font-bold my-4" style={{ color: watchedValues.primaryColor }}>{watchedValues.title}</h1>
              <p className="text-lg">This certificate is awarded to</p>
              <p className="text-3xl font-serif italic my-4">Alex Johnson</p>
              <p className="max-w-xl mx-auto text-base">{previewBody}</p>
            </div>
            <div className="z-10 w-full flex justify-between items-end px-16 mt-8">
              <div className="text-center">
                {signatureUrl && <div className="relative h-16 w-48 mx-auto mb-2"><Image src={signatureUrl} alt="Signature" layout="fill" objectFit="contain" /></div>}
                <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
                <p className="text-sm font-semibold mt-1">{watchedValues.signatoryName}</p>
                <p className="text-xs text-muted-foreground">{watchedValues.signatoryTitle}</p>
              </div>
              <div className="relative h-28 w-28">
                {stampUrl && <Image src={stampUrl} alt="Stamp" layout="fill" objectFit="contain" />}
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
            <div className="w-1/4 h-full" style={{ backgroundColor: watchedValues.primaryColor, opacity: 0.8 }} />
            <div className="w-3/4 h-full p-12 flex flex-col justify-between">
                <div>
                    <div className="flex items-center gap-4 mb-8">
                        {watchedValues.logoUrl && <div className="relative h-16 w-16"><Image src={watchedValues.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" /></div>}
                        <h2 className="text-3xl font-bold font-headline">{watchedValues.organization}</h2>
                    </div>
                    <p className="text-muted-foreground text-sm uppercase tracking-widest">Certificate Of Completion</p>
                    <h1 className="text-5xl font-bold my-2" style={{ color: watchedValues.primaryColor }}>{watchedValues.title}</h1>
                    <p className="text-lg text-muted-foreground">Awarded to</p>
                    <p className="text-3xl font-bold">Alex Johnson</p>
                </div>
                 <div className="mt-8">
                    <p className="max-w-md text-sm">{previewBody}</p>
                 </div>
                 <div className="flex justify-between items-end mt-8">
                    <div className="text-left">
                        {signatureUrl && <div className="relative h-12 w-32 mb-1"><Image src={signatureUrl} alt="Signature" layout="fill" objectFit="contain" /></div>}
                        <p className="text-lg font-bold">{watchedValues.signatoryName}</p>
                        <p className="text-sm text-muted-foreground">{watchedValues.signatoryTitle}</p>
                    </div>
                     {stampUrl && <div className="relative h-20 w-20"><Image src={stampUrl} alt="Stamp" layout="fill" objectFit="contain" /></div>}
                 </div>
            </div>
          </Card>
        );
    }
  }


  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Customize Certificate</CardTitle>
            <CardDescription>Use the form below to edit the certificate content and style. Placeholders like [Student Name] are supported.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormItem>
                  <FormLabel>Organization Logo</FormLabel>
                  {logoUrl ? (
                    <div className="flex items-center gap-2">
                      <Image src={logoUrl} alt="Logo preview" width={100} height={40} className="border rounded-md bg-muted p-1" />
                      <Button variant="ghost" size="sm" onClick={() => handleImageRemove(setLogoUrl, 'logoUrl')}>
                        <X className="mr-2 h-4 w-4" /> Remove
                      </Button>
                    </div>
                  ) : (
                    <FormControl>
                      <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleImageUpload(e, setLogoUrl, 'logoUrl')} />
                    </FormControl>
                  )}
                  <FormMessage />
                </FormItem>
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

                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="text-sm font-medium">Styling</h3>
                     <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Palette className="h-4 w-4" /> Primary Color</FormLabel>
                                <FormControl>
                                    <Input type="color" {...field} value={field.value || ''} className="h-10 p-1"/>
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />
                    <FormField
                    control={form.control}
                    name="templateStyle"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-2"><Brush className="h-4 w-4" /> Template Style</FormLabel>
                        <div className="flex gap-2">
                            {templateStyleOptions.map(style => (
                            <Button
                                key={style}
                                type="button"
                                variant={field.value === style ? 'default' : 'outline'}
                                onClick={() => field.onChange(style)}
                            >
                                {style}
                            </Button>
                            ))}
                        </div>
                        </FormItem>
                    )}
                    />
                </div>


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
        {renderPreview()}
      </div>
    </div>
  );
}
