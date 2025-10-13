
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent, role: 'staff' | 'admin') => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const email = (form.elements.namedItem(`${role}-email`) as HTMLInputElement).value;
    const password = (form.elements.namedItem(`${role}-password`) as HTMLInputElement).value;

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (data.isSuccess) {
      // In a real app, you'd store the accessToken and refreshToken securely
      // (e.g., in httpOnly cookies) and manage sessions.
      // For this prototype, we'll just navigate.
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      if (data.user.role.name.toLowerCase() === 'admin') {
         router.push('/admin/analytics');
      } else {
         router.push('/dashboard');
      }
    } else {
      toast({
        title: 'Login Failed',
        description: data.errors?.[0] || 'Invalid credentials.',
        variant: 'destructive',
      });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome to SkillUp</CardTitle>
          <CardDescription>Select your role and sign in to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="staff" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="staff">Staff</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="staff">
              <form onSubmit={(e) => handleLogin(e, 'staff')} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    name="staff-email"
                    type="email"
                    placeholder="name@company.com"
                    defaultValue="staff@skillup.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-password">Password</Label>
                  <Input id="staff-password" name="staff-password" type="password" defaultValue="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Sign In as Staff
                </Button>
                <div className="text-center text-sm">
                    Don't have an account?{' '}
                    <Link href="/login/register" className="underline">
                        Sign Up
                    </Link>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="admin">
              <form onSubmit={(e) => handleLogin(e, 'admin')} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    name="admin-email"
                    type="email"
                    placeholder="admin@company.com"
                    defaultValue="admin@skillup.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input id="admin-password" name="admin-password" type="password" defaultValue="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Sign In as Admin
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
