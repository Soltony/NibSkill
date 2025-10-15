
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import '@/app/globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Quiz - SkillUp',
  description: 'Take your knowledge check.',
};

export default function QuizLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans bg-muted`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
