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
import { Logo } from '@/components/logo';
import { Shield, User } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Please select your role to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <Button size="lg" onClick={() => router.push('/login/admin')}>
                <Shield className="mr-2 h-5 w-5" />
                Login as Admin
            </Button>
            <Button size="lg" variant="outline" onClick={() => router.push('/login/staff')}>
                <User className="mr-2 h-5 w-5" />
                Login as Member
            </Button>
        </CardContent>
         <CardContent className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/login/register" className="underline">
                Sign Up as a Member
            </Link>
        </CardContent>
      </Card>
    </main>
  );
}
