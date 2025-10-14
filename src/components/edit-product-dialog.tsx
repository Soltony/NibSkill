
"use client"

import { useState, useEffect, ChangeEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { updateProduct } from "@/app/actions/product-actions"
import type { Product } from "@prisma/client"
import Image from "next/image"
import { X } from "lucide-react"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  imageUrl: z.string().url("An image is required."),
  imageHint: z.string().optional(),
})

type EditProductDialogProps = {
  product: Product
}

export function EditProductDialog({ product }: EditProductDialogProps) {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [imageUrl, setImageUrl] = useState<string | null>(product.imageUrl);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product.name,
      description: product.description,
      imageUrl: product.imageUrl,
    },
  })
  
  useEffect(() => {
    if (open) {
      form.reset({
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
      })
      setImageUrl(product.imageUrl)
    }
  }, [open, product, form])

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setImageUrl(dataUrl);
        form.setValue("imageUrl", dataUrl, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    form.setValue("imageUrl", "", { shouldValidate: true });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const result = await updateProduct(product.id, values);
    if (result.success) {
      toast({
        title: "Product Updated",
        description: `The product "${values.name}" has been successfully updated.`,
      })
      setOpen(false)
    } else {
       toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>
            Update the details for the product below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., FusionX" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief summary of the product."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Image</FormLabel>
                   {imageUrl ? (
                     <div className="relative aspect-video w-full">
                       <Image src={imageUrl} alt="Product image preview" fill className="rounded-md object-cover" />
                       <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={removeImage}>
                         <X className="h-4 w-4" />
                       </Button>
                     </div>
                   ) : (
                    <FormControl>
                      <Input type="file" accept="image/png, image/jpeg, image/gif" onChange={handleImageUpload} />
                    </FormControl>
                   )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
