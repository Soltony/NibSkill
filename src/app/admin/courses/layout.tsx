
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - Course Management',
  description: 'Manage courses for NIB Training.',
};

export default function CourseLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
        {children}
    </>
  );
}
