
import type { Metadata } from 'next';
import AppRoot from './root-layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'NIB Training',
  description: 'Corporate Training and Digital Product Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <AppRoot>{children}</AppRoot>
  );
}
