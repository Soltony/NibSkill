
"use client"

import { useState, ChangeEvent } from "react"
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
import { PlusCircle, Image as ImageIcon, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { addProduct } from "@/app/actions/product-actions"
import Image from "next/image"

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  imageUrl: z.string().url("An image is required."),
  imageHint: z.string().optional(),
})

export function AddProductDialog() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()
  const [imageUrl, setImageUrl] = useState<string | null>(null);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      imageUrl: "",
    },
  })

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
    const result = await addProduct(values);
    if (result.success) {
      toast({
        title: "Product Added",
        description: `The product "${values.name}" has been successfully created.`,
      })
      setOpen(false)
      form.reset()
      setImageUrl(null);
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
            form.reset();
            setImageUrl(null);
        }
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Product
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new product.
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
                {form.formState.isSubmitting ? 'Creating...' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
