import { securityLog } from './logger';
import type { Role } from '@prisma/client';

export type Action = 'c' | 'r' | 'u' | 'd';

// A lightweight session-like object returned by getSession()/verifyAuth
export interface SessionLike {
  id: string;
  role?: Role | null;
  trainingProviderId?: string | null;
}

export function hasPermission(session: SessionLike | null | undefined, resource: string, action: Action): boolean {
  try {
    if (!session || !session.role || !session.role.permissions) return false;
    const perms: any = session.role.permissions as any;
    const res = perms?.[resource];
    if (!res) return false;
    return !!res[action];
  } catch (e) {
    // Fail-closed on any unexpected error
    try { securityLog('error', 'permission_check_error', { resource, action, error: String(e) }); } catch (ee) {}
    return false;
  }
}

export function requirePermission(session: SessionLike | null | undefined, resource: string, action: Action) {
  const ok = hasPermission(session, resource, action);
  if (!ok) {
    try { securityLog('warn', 'permission_denied', { resource, action, userId: session?.id ?? null, role: session?.role?.name ?? null }); } catch (e) {}
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return true;
}
