
"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
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
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { differenceInSeconds } from 'date-fns';

type LockoutInfo = {
    isLockedOut: boolean;
    lockoutEndsAt: string | null;
    remainingAttempts: number;
} | null;

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutInfo, setLockoutInfo] = useState<LockoutInfo>(null);
  const [countdown, setCountdown] = useState(0);
  const [activeTab, setActiveTab] = useState("staff");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutInfo?.isLockedOut && lockoutInfo.lockoutEndsAt) {
      const endsAt = new Date(lockoutInfo.lockoutEndsAt);
      const now = new Date();
      const secondsRemaining = differenceInSeconds(endsAt, now);

      if (secondsRemaining > 0) {
        setCountdown(secondsRemaining);
        timer = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setLockoutInfo(null); // Reset lockout
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setLockoutInfo(null);
      }
    }
    return () => clearInterval(timer);
  }, [lockoutInfo]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const form = e.target as HTMLFormElement;
    const phoneNumber = (form.elements.namedItem('phoneNumber') as HTMLInputElement).value;
    const password = (form.elements.namedItem('password') as HTMLInputElement).value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, password, loginAs: activeTab }),
      });

      const data = await response.json();
      setLockoutInfo(data.lockoutInfo || null);

      if (data.isSuccess) {
        toast({
          title: 'Login Successful',
          description: `Welcome back!`,
        });

        if (data.passwordChangeRequired) {
          setIsLoading(false);
          router.push(data.redirectTo);
        } else {
          router.push(data.redirectTo || (activeTab === 'admin' ? '/admin/analytics' : '/dashboard'));
        }
      } else {
        let description = data.errors?.[0] || 'Invalid credentials.';
        if (response.status === 429) {
          description = data.errors[0];
        } else if (data.lockoutInfo?.isLockedOut && data.lockoutInfo?.lockoutEndsAt) {
            const endsAt = new Date(data.lockoutInfo.lockoutEndsAt);
            const secondsRemaining = differenceInSeconds(endsAt, new Date());
            description = `Too many failed attempts. Please try again in ${secondsRemaining} seconds.`;
        } else if (data.lockoutInfo?.remainingAttempts !== undefined) {
             description += ` ${data.lockoutInfo.remainingAttempts} attempts remaining.`;
        }
        
        toast({
          title: 'Login Failed',
          description,
          variant: 'destructive',
        });
        setIsLoading(false);
      }
    } catch (error) {
      toast({
          title: 'Login Failed',
          description: 'An error occurred during login. Please try again.',
          variant: 'destructive',
        });
      setIsLoading(false);
    }
  };

  const LoginForm = () => {
    const [showPassword, setShowPassword] = useState(false);
    const isFormDisabled = isLoading || !!lockoutInfo?.isLockedOut;
    const role = activeTab;

    return (
        <form onSubmit={handleLogin}>
        <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
            <Label htmlFor={`${role}-phoneNumber`}>Phone Number</Label>
            <Input 
                id={`${role}-phoneNumber`} 
                name="phoneNumber"
                type="tel" 
                placeholder="e.g. 2519..." 
                required 
                disabled={isFormDisabled}
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
                disabled={isFormDisabled}
                />
                <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isFormDisabled}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                </Button>
            </div>
            </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isFormDisabled}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {lockoutInfo?.isLockedOut ? `Try again in ${countdown}s` :
               isLoading ? 'Signing In...' : `Sign In`
              }
            </Button>
        </CardFooter>
        </form>
    );
  }

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
        
        <Tabs defaultValue="staff" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="staff" disabled={isLoading || !!lockoutInfo?.isLockedOut}>Staff</TabsTrigger>
            <TabsTrigger value="admin" disabled={isLoading || !!lockoutInfo?.isLockedOut}>Admin</TabsTrigger>
          </TabsList>
          <TabsContent value="staff">
            <LoginForm />
          </TabsContent>
          <TabsContent value="admin">
            <LoginForm />
          </TabsContent>
        </Tabs>
        
        <CardContent className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <Link href="/login/register" className="underline">
            Sign Up
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
