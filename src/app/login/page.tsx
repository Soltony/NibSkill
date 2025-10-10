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

export default function LoginPage() {
  const router = useRouter();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/admin/courses');
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
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
              <form onSubmit={handleStaffLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="name@company.com"
                    defaultValue="staff@skillup.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="staff-password">Password</Label>
                  <Input id="staff-password" type="password" defaultValue="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Sign In as Staff
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="admin">
              <form onSubmit={handleAdminLogin} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@company.com"
                    defaultValue="admin@skillup.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input id="admin-password" type="password" defaultValue="password" required />
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
