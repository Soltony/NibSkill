import prisma from './db';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';

const COMMON_PASSWORDS = new Set([
  'password', '123456', '123456789', 'qwerty', '12345678', '111111', '1234567', 'sunshine', 'iloveyou', 'password1', 'admin123', 'welcome123', 'superadmin123', 'skillup123'
]);

export const MIN_PASSWORD_LENGTH = Number(process.env.MIN_PASSWORD_LENGTH) || 8;
export const PASSWORD_HISTORY_DEPTH = Number(process.env.PASSWORD_HISTORY_DEPTH) || 5;

export async function isBreachedPassword(password: string): Promise<boolean> {
  try {
    // Use k-anonymity model from Have I Been Pwned
    const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!res.ok) return false; // fail-open: if API unavailable, don't block; caller may choose otherwise
    const text = await res.text();
    const lines = text.split('\n');
    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix && hashSuffix.trim() === suffix) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false; // fail-open
  }
}

export function validatePasswordBasic(password: string) {
  const errors: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }
  if (!/[a-z]/.test(password)) errors.push('Password must include a lowercase letter.');
  if (!/[A-Z]/.test(password)) errors.push('Password must include an uppercase letter.');
  if (!/[0-9]/.test(password)) errors.push('Password must include a number.');
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Password must include a special character.');
  if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('Password is too common.');
  return { ok: errors.length === 0, errors };
}

export async function isPasswordInHistory(userId: string, password: string): Promise<boolean> {
  const history = await prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: PASSWORD_HISTORY_DEPTH });
  for (const h of history) {
    try {
      if (await bcrypt.compare(password, h.password)) return true;
    } catch (e) {
      // ignore
    }
  }
  return false;
}

export async function recordPasswordHistory(userId: string, hashedPassword: string) {
  try {
    await prisma.passwordHistory.create({ data: { userId, password: hashedPassword } });
    // prune older entries beyond depth
    const history = await prisma.passwordHistory.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (history.length > PASSWORD_HISTORY_DEPTH) {
      const toRemove = history.slice(PASSWORD_HISTORY_DEPTH).map(h => h.id);
      await prisma.passwordHistory.deleteMany({ where: { id: { in: toRemove } } });
    }
  } catch (e) {
    // best-effort
    console.warn('recordPasswordHistory failed', e);
  }
}

export default { validatePasswordBasic, isBreachedPassword, isPasswordInHistory, recordPasswordHistory };
