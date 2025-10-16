
"use client";

import React, { useState, useEffect } from 'react';
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
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { getLoginIdentifier } from '../actions/settings-actions';
import { Skeleton } from '@/components/ui/skeleton';

type LoginIdentifier = {
  id: string;
  label: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdentifier, setLoginIdentifier] = useState<LoginIdentifier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLoginIdentifier() {
      try {
        setIsLoading(true);
        const identifier = await getLoginIdentifier();
        if (identifier) {
          setLoginIdentifier(identifier);
        } else {
          // Fallback to email if not configured
          setLoginIdentifier({ id: 'email', label: 'Email' });
        }
      } catch (error) {
        toast({
          title: 'Configuration Error',
          description: 'Could not load login settings. Defaulting to email.',
          variant: 'destructive',
        });
        setLoginIdentifier({ id: 'email', label: 'Email' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchLoginIdentifier();
  }, [toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier) return;

    const form = e.target as HTMLFormElement;
    const identifier = (form.elements.namedItem('identifier') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, identifierField: loginIdentifier.id }),
    });

    const data = await response.json();

    if (data.isSuccess) {
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

  const renderLoginForm = () => {
    if (isLoading || !loginIdentifier) {
      return (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    return (
      <form onSubmit={handleLogin} className="space-y-4 pt-4">
        <div className="space-y-2">
          <Label htmlFor="identifier">{loginIdentifier.label}</Label>
          <Input
            id="identifier"
            name="identifier"
            type={loginIdentifier.id === 'email' ? 'email' : 'text'}
            placeholder={`Enter your ${loginIdentifier.label.toLowerCase()}`}
            defaultValue={loginIdentifier.id === 'email' ? 'staff@nibskillup.com' : ''}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input 
              id="password" 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              defaultValue="skillup123" 
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
              <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
            </Button>
          </div>
        </div>
        <Button type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    );
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome to NibSkillUP</CardTitle>
          <CardDescription>Sign in to continue to your dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {renderLoginForm()}
          <div className="mt-4 text-center text-sm">
            Don't have an account?{' '}
            <Link href="/login/register" className="underline">
                Sign Up
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
