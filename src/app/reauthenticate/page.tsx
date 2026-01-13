"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ReauthenticatePage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reauthenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Re-authenticated', description: 'You can now proceed with the sensitive action.' });
        router.push('/profile');
      } else {
        toast({ title: 'Error', description: data.message || 'Failed to re-authenticate.', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Unexpected error while re-authenticating.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h2 className="text-lg font-semibold mb-4">Please re-enter your password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="password" className="w-full p-2 border rounded" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Current password" />
        <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Re-authenticate'}</button>
      </form>
    </div>
  );
}
