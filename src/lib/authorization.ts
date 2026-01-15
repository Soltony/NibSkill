import { securityLog } from './logger';
import type { Role } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

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

/**
 * Check exact role name on the session (non-hierarchical)
 */
export function isRole(session: SessionLike | null | undefined, roleName: string): boolean {
  return !!(session && session.role && session.role.name === roleName);
}

export function requireExactRole(session: SessionLike | null | undefined, roleName: string) {
  if (!isRole(session, roleName)) {
    try { securityLog('warn', 'authorization_denied', { userId: session?.id ?? null, role: session?.role?.name ?? null, requiredRole: roleName }); } catch (e) {}
    const err: any = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return true;
}

/**
 * Check whether a user (by id) has access to a course.
 * - Public courses are accessible by anyone.
 * - `Super Admin` and `Admin` roles bypass assignment checks.
 * - Otherwise the user's department/branch/district must match any of the course's assigned groups.
 */
export async function hasAccessToCourse(prisma: PrismaClient, userId: string | null | undefined, courseId: string) : Promise<boolean> {
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        assignedDepartments: { select: { id: true } },
        assignedBranches: { select: { id: true } },
        assignedDistricts: { select: { id: true } },
      }
    });
    if (!course) return false;
    if (course.isPublic) return true;

    if (!userId) return false;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });
    if (!user) return false;

    const roleNames = (user.roles || []).map(r => r.role?.name).filter(Boolean) as string[];
    if (roleNames.includes('Super Admin') || roleNames.includes('Admin')) return true;

    // Training provider must match
    if (!user.trainingProviderId || user.trainingProviderId !== course.trainingProviderId) return false;

    // If the course has no assigned groups (empty arrays) treat it as not visible to restricted users
    const deptIds = (course.assignedDepartments || []).map(d => d.id);
    const branchIds = (course.assignedBranches || []).map(b => b.id);
    const districtIds = (course.assignedDistricts || []).map(d => d.id);

    if (user.departmentId && deptIds.includes(user.departmentId)) return true;
    if (user.branchId && branchIds.includes(user.branchId)) return true;
    if (user.districtId && districtIds.includes(user.districtId)) return true;

    return false;
  } catch (e) {
    try { securityLog('error', 'access_check_failed', { userId, courseId, error: String(e) }); } catch (ee) {}
    return false;
  }
}
