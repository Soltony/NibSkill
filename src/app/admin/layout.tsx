
import type { Metadata } from 'next';
import { getSession } from '@/lib/auth';
import { requireExactRole } from '@/lib/authorization';

export const metadata: Metadata = {
  title: 'Admin - NIB Training',
  description: 'Admin dashboard for NIB Training.',
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side enforcement: only Admin role may access admin pages
  const session = await getSession();
  try {
    requireExactRole(session, 'Admin');
  } catch (e) {
    const { notFound } = await import('next/navigation');
    notFound();
  }

  return (
    <>
        {children}
    </>
  );
}
