
"use client"

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";

const passwordFormSchema = z.object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters long."),
    confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

export default function ChangePasswordPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const form = useForm<z.infer<typeof passwordFormSchema>>({
        resolver: zodResolver(passwordFormSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        }
    });

    const onSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
        const response = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(values),
        });

        const data = await response.json();

        if (response.ok) {
            toast({
                title: 'Password Changed Successfully',
                description: 'Your password has been updated. Please log in again.',
            });
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } else {
            toast({
                title: 'Error Changing Password',
                description: data.errors?.[0] || 'An unexpected error occurred.',
                variant: 'destructive',
            });
        }
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-muted p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                     <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
                    <CardTitle className="font-headline text-3xl">Change Your Password</CardTitle>
                    <CardDescription>For your security, you must change your password before proceeding.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="currentPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Current Password</FormLabel>
                                        <div className="relative">
                                            <FormControl>
                                                <Input type={showCurrent ? 'text' : 'password'} {...field} />
                                            </FormControl>
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowCurrent(p => !p)}>
                                                {showCurrent ? <EyeOff /> : <Eye />}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>New Password</FormLabel>
                                         <div className="relative">
                                            <FormControl>
                                                <Input type={showNew ? 'text' : 'password'} {...field} />
                                            </FormControl>
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowNew(p => !p)}>
                                                {showNew ? <EyeOff /> : <Eye />}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Confirm New Password</FormLabel>
                                         <div className="relative">
                                            <FormControl>
                                                <Input type={showConfirm ? 'text' : 'password'} {...field} />
                                            </FormControl>
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => setShowConfirm(p => !p)}>
                                                {showConfirm ? <EyeOff /> : <Eye />}
                                            </Button>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                <KeyRound className="mr-2 h-4 w-4" />
                                {form.formState.isSubmitting ? "Updating..." : "Update Password and Login"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </main>
    )
}
