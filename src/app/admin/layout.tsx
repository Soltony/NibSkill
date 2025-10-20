
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin - NIB Training',
  description: 'Admin dashboard for NIB Training.',
};

export default function AdminLayout({
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
