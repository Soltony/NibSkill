
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import type { RegistrationField as TRegistrationField, District, Branch, Department } from "@prisma/client";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { initialRegistrationFields } from "@/lib/data";


const baseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Create initial default values from both static and dynamic fields
const allDefaultValues = {
  name: "",
  email: "",
  password: "",
  ...initialRegistrationFields.reduce((acc, field) => {
    acc[field.id] = "";
    return acc;
  }, {} as Record<string, string>)
};

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [registrationFields, setRegistrationFields] = useState<TRegistrationField[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [dynamicSchema, setDynamicSchema] = useState(baseSchema);

  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: allDefaultValues
  });
  
  const watchedDistrict = form.watch('district');
  const availableBranches = useMemo(() => {
    if (!watchedDistrict) return [];
    return branches.filter(b => b.districtId === watchedDistrict);
  }, [watchedDistrict, branches]);

  useEffect(() => {
    async function fetchFormData() {
      try {
        const response = await fetch('/api/registration-data');
        if (!response.ok) {
          throw new Error('Failed to fetch registration data');
        }
        const { fields, districtsData, branchesData, departmentsData } = await response.json();

        setRegistrationFields(fields);
        setDistricts(districtsData);
        setBranches(branchesData);
        setDepartments(departmentsData);

        let schema = baseSchema as z.ZodObject<any>;
        fields.forEach((field: TRegistrationField) => {
          if (field.required) {
            schema = schema.extend({ [field.id]: z.string().min(1, `${field.label} is required`) });
          } else {
            schema = schema.extend({ [field.id]: z.string().optional() });
          }
        });
        setDynamicSchema(schema as any);
      } catch (error) {
        toast({
          title: "Error",
          description: "Could not load registration form. Please try again later.",
          variant: "destructive"
        })
      } finally {
        setIsLoaded(true);
      }
    }
    fetchFormData();
  }, [toast]);
  
  const onRegisterUser = async (values: z.infer<typeof dynamicSchema>) => {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
    });
    
    const data = await response.json();

    if (data.isSuccess) {
      toast({
        title: "Registration Successful",
        description: "You can now sign in with your new account.",
      });
      router.push("/login");
    } else {
       toast({
        title: "Registration Failed",
        description: data.errors?.[0] || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };
  
  const renderField = (field: TRegistrationField) => {
    const commonProps = {
      key: field.id,
      control: form.control,
      name: field.id
    };

    switch (field.type) {
      case 'TEXT':
        return (
          <FormField
            {...commonProps}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <FormControl><Input {...formField} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      case 'NUMBER':
          return (
            <FormField
              {...commonProps}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>{field.label}</FormLabel>
                  <FormControl><Input type="number" {...formField} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
      case 'DATE':
          return (
            <FormField
              {...commonProps}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>{field.label}</FormLabel>
                  <FormControl><Input type="date" {...formField} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
      case 'SELECT':
        let options: {id: string, name: string}[] = [];
        if (field.id === 'department') options = departments;
        if (field.id === 'district') options = districts;
        if (field.id === 'branch') options = availableBranches;
        // For other custom SELECT fields, you would fetch options or use field.options
        
        return (
          <FormField
            {...commonProps}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>{field.label}</FormLabel>
                <Select onValueChange={formField.onChange} defaultValue={formField.value} disabled={field.id === 'branch' && !watchedDistrict}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder={field.id === 'branch' && !watchedDistrict ? "Select district first" : `Select a ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {options.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      default:
        return null;
    }
  };

  if (!isLoaded) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4"><Logo /></div>
                  <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
                  <CardDescription>Enter your details to register as a staff member.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Skeleton className="h-10 w-full" />
                </CardFooter>
            </Card>
        </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onRegisterUser)}>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <Logo />
              </div>
              <CardTitle className="font-headline text-3xl">Create an Account</CardTitle>
              <CardDescription>Enter your details to register as a staff member.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="user@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {registrationFields.map(field => renderField(field))}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {form.formState.isSubmitting ? 'Registering...' : 'Register'}
              </Button>
              <div className="text-center text-sm">
                Already have an account?{' '}
                <Link href="/login" className="underline">
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}

    