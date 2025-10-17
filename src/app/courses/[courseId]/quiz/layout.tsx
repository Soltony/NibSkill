
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quiz - NIB Training',
  description: 'Take your knowledge check.',
};

export default function QuizLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-muted min-h-screen">
        {children}
    </div>
  );
}
