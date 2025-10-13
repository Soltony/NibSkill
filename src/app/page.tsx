
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the login page as the root.
    // The actual dashboard will be at `/dashboard`.
    router.replace('/login');
  }, [router]);

  // Return null or a loading spinner while redirecting
  return null;
}
