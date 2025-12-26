
"use client";

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CoursesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  // Return null or a loading spinner while redirecting
  return null;
}
