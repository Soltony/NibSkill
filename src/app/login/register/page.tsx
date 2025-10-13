
"use client";

import { useState, useEffect } from "react";
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
import prisma from "@/lib/db";


const baseSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoaded, setIsLoaded] = useState(false);
  const [registrationFields, setRegistrationFields] = useState<TRegistrationField[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [dynamicSchema, setDynamicSchema] = useState(baseSchema);

  useEffect(() => {
    async function fetchFormData() {
      // In a real app, you would fetch this data from an API route
      // For this prototype, we'll use Prisma directly in a client component, which is not recommended for production.
      const fields = await prisma.registrationField.findMany({ where: { enabled: true } });
      const districtsData = await prisma.district.findMany();
      const branchesData = await prisma.branch.findMany();
      const departmentsData = await prisma.department.findMany();

      setRegistrationFields(fields);
      setDistricts(districtsData);
      setBranches(branchesData);
      setDepartments(departmentsData);

      let schema = baseSchema as z.ZodObject<any>;
      fields.forEach((field) => {
        if (field.required) {
          schema = schema.extend({ [field.id]: z.string().min(1, `${field.label} is required`) });
        } else {
          schema = schema.extend({ [field.id]: z.string().optional() });
        }
      });
      setDynamicSchema(schema as any);
      setIsLoaded(true);
    }
    fetchFormData();
  }, []);

  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

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

  const getField = (id: string) => registrationFields.find(f => f.id === id);

  const selectedDistrict = form.watch('district');
  const availableBranches = branches.filter(b => b.districtId === selectedDistrict);

  if (!isLoaded) {
    return <div>Loading form...</div>
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
              {getField('phoneNumber')?.enabled && (
                <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                        <Input placeholder="(123) 456-7890" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
               {getField('department')?.enabled && (
                <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Department</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a department" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
               {getField('district')?.enabled && (
                <FormField
                    control={form.control}
                    name="district"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>District</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder="Select a district" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {districts.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
               {getField('branch')?.enabled && (
                <FormField
                    control={form.control}
                    name="branch"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Branch</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedDistrict}>
                            <FormControl>
                                <SelectTrigger><SelectValue placeholder={selectedDistrict ? "Select a branch" : "Select a district first"} /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {availableBranches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              )}
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
