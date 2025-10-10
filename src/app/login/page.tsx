import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { User, Shield } from 'lucide-react';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Logo />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome to SkillUp</CardTitle>
          <CardDescription>Select your role to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Button asChild variant="outline" size="lg" className="h-24 flex-col gap-2">
            <Link href="/login/staff">
              <User className="h-8 w-8" />
              <span>Staff Login</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-24 flex-col gap-2">
            <Link href="/login/admin">
              <Shield className="h-8 w-8" />
              <span>Admin Login</span>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
