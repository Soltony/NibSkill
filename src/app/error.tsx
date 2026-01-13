'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ErrorProps {
  error: any
  reset: () => void
}

export default function GlobalError({ error }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    try {
      // Log error to console for debugging
      console.error('Global error boundary caught:', error);

      const msg = typeof error?.message === 'string' ? error.message.toLowerCase() : '';

      // If this looks like a permission/authorization error, redirect to profile
      if (msg.includes('forbidden') || msg.includes('unauthorized') || msg.includes('not authenticated')) {
        router.replace('/profile');
        return;
      }

      // For other unexpected errors, also redirect to profile as a safe fallback
      router.replace('/profile');
    } catch (e) {
      // If anything goes wrong, force a browser navigation as a last resort
      try { window.location.href = '/profile'; } catch (ee) {}
    }
  }, [error, router]);

  return (
    <div style={{padding: '2rem'}}>
      <h1>Redirecting…</h1>
      <p>If you are not redirected automatically, <a href="/profile">click here</a>.</p>
    </div>
  )
}
