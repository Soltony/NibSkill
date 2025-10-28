
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
  signatoryName: z.string().min(3, "Signatory name is required"),
  signatoryTitle: z.string().min(3, "Signatory title is required"),
  logoUrl: z.string().nullable(),
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

const colorOptions = ["#4a6e3a", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316"];
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
      primaryColor: template.primaryColor || colorOptions[0],
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
                      <FormDescription>This will be shown if no logo is uploaded.</FormDescription>
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
                        <div className="flex gap-2">
                            {colorOptions.map(color => (
                            <Button
                                key={color}
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-full"
                                style={{ backgroundColor: color }}
                                onClick={() => field.onChange(color)}
                            >
                                {field.value === color && <Check className="h-5 w-5 text-white" />}
                            </Button>
                            ))}
                        </div>
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
        <Card
          className={cn(
            "aspect-[11/8.5] w-full p-8 flex flex-col items-center justify-between text-center bg-white shadow-2xl relative overflow-hidden",
            watchedValues.templateStyle === "Classic" && "font-serif",
            watchedValues.templateStyle === "Formal" && "font-sans"
          )}
          style={certificateStyle}
        >
          <div 
            className="absolute inset-0 border-4 m-2 rounded-lg"
            style={{ borderColor: watchedValues.primaryColor, opacity: 0.2 }}
          />
          <div
            className="absolute inset-0 border-8 m-4 rounded-lg"
            style={{ borderColor: watchedValues.primaryColor, opacity: 0.8, borderStyle: watchedValues.borderStyle }}
          />

          <div className="z-10 w-full h-16 relative">
            {watchedValues.logoUrl ? (
                <Image src={watchedValues.logoUrl} alt="Organization Logo" layout="fill" objectFit="contain" />
            ) : (
                <h2 
                    className="text-2xl font-bold font-headline"
                    style={{ color: watchedValues.primaryColor }}
                >
                    {watchedValues.organization}
                </h2>
            )}
          </div>

          <div className="z-10">
            <h1
              className={cn(
                "font-bold mb-4",
                watchedValues.templateStyle === "Classic" ? "text-5xl" : "text-4xl",
                watchedValues.templateStyle === "Formal" ? "text-6xl tracking-widest uppercase" : "font-headline"
              )}
              style={{ color: watchedValues.primaryColor }}
            >
              {watchedValues.title}
            </h1>
            <p className={cn(
              "max-w-xl mx-auto",
              watchedValues.templateStyle === "Formal" ? "text-base" : "text-lg text-foreground/80"
            )}>
              {previewBody}
            </p>
          </div>
          
          <div className="z-10 w-full flex justify-around items-end">
            <div className="text-center">
              {signatureUrl ? (
                <div className="relative h-16 w-48 mx-auto mb-2">
                  <Image src={signatureUrl} alt="Signature" layout="fill" objectFit="contain" />
                </div>
              ) : <div className="h-16"></div>}
              <p className={cn("text-xl", watchedValues.templateStyle === "Formal" ? "font-sans" : "font-serif italic")}>{watchedValues.signatoryName}</p>
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
              <p className={cn("text-xl", watchedValues.templateStyle === "Formal" ? "font-sans" : "font-serif italic")}>{new Date().toLocaleDateString()}</p>
              <div className="w-48 h-px bg-foreground/50 mx-auto mt-1"></div>
              <p className="text-sm text-muted-foreground">Date of Issue</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
