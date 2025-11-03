"use client";

import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent, role: 'admin' | 'staff') => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const phoneNumber = (form.elements.namedItem('phoneNumber') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, password, loginAs: role }),
    });

    const data = await response.json();

    if (data.isSuccess) {
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${role === 'admin' ? 'Admin' : 'Member'}!`,
      });
      router.push(data.redirectTo || (role === 'admin' ? '/admin/analytics' : '/dashboard'));
    } else {
      toast({
        title: 'Login Failed',
        description: data.errors?.[0] || 'Invalid credentials.',
        variant: 'destructive',
      });
    }
  };

  const LoginForm = ({ role }: { role: 'admin' | 'staff' }) => (
    <form onSubmit={(e) => handleLogin(e, role)}>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${role}-phoneNumber`}>Phone Number</Label>
          <Input 
            id={`${role}-phoneNumber`} 
            name="phoneNumber"
            type="tel" 
            placeholder="e.g. 2519..." 
            required 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${role}-password`}>Password</Label>
          <div className="relative">
            <Input 
              id={`${role}-password`}
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              required 
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button type="submit" className="w-full">
          Sign In as {role === 'admin' ? 'Admin' : 'Member'}
        </Button>
      </CardFooter>
    </form>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Please select your role and sign in.</CardDescription>
        </CardHeader>
        
        <Tabs defaultValue="member" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="member">Member</TabsTrigger>
            <TabsTrigger value="admin">Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="member">
            <LoginForm role="staff" />
          </TabsContent>
          <TabsContent value="admin">
            <LoginForm role="admin" />
          </TabsContent>
        </Tabs>
        
        <CardContent className="mt-4 text-center text-sm">
          Don't have a member account?{' '}
          <Link href="/login/register" className="underline">
            Sign Up
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}