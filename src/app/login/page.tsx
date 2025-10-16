

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
import { getLoginIdentifiers } from '../actions/settings-actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type LoginIdentifier = {
  id: string;
  label: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loginIdentifiers, setLoginIdentifiers] = useState<LoginIdentifier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIdentifier, setSelectedIdentifier] = useState<LoginIdentifier | null>(null);

  useEffect(() => {
    async function fetchLoginIdentifiers() {
      try {
        setIsLoading(true);
        const identifiers = await getLoginIdentifiers();
        setLoginIdentifiers(identifiers);
        if (identifiers.length > 0) {
            setSelectedIdentifier(identifiers[0]);
        }
      } catch (error) {
        toast({
          title: 'Configuration Error',
          description: 'Could not load login settings.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchLoginIdentifiers();
  }, [toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIdentifier) return;

    const form = e.target as HTMLFormElement;
    const identifierValue = (form.elements.namedItem('identifier') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifierValue, password, identifierField: selectedIdentifier.id }),
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
    if (isLoading) {
      return (
        <div className="space-y-4 pt-4">
          <Skeleton className="h-10 w-full" />
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

    if (loginIdentifiers.length === 0) {
        return <p className="text-center text-destructive">Login not configured. Please contact an administrator.</p>
    }
    
    return (
     <Tabs defaultValue={loginIdentifiers[0].id} onValueChange={(value) => setSelectedIdentifier(loginIdentifiers.find(i => i.id === value) || null)}>
        <TabsList className="grid w-full grid-cols-2">
            {loginIdentifiers.map(identifier => (
                <TabsTrigger key={identifier.id} value={identifier.id}>
                    {identifier.label}
                </TabsTrigger>
            ))}
        </TabsList>
        {loginIdentifiers.map(identifier => (
            <TabsContent key={identifier.id} value={identifier.id}>
                <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                    <Label htmlFor={`identifier-${identifier.id}`}>{identifier.label}</Label>
                    <Input
                        id={`identifier-${identifier.id}`}
                        name="identifier"
                        type={identifier.id === 'email' ? 'email' : 'text'}
                        placeholder={`Enter your ${identifier.label.toLowerCase()}`}
                        required
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor={`password-${identifier.id}`}>Password</Label>
                    <div className="relative">
                        <Input 
                        id={`password-${identifier.id}`}
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
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                        </Button>
                    </div>
                    </div>
                    <Button type="submit" className="w-full">
                    Sign In
                    </Button>
                </form>
            </TabsContent>
        ))}
     </Tabs>
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
