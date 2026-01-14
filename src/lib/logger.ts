
import fs from 'fs/promises';
import path from 'path';
import { createHmac } from 'crypto';

const LOG_DIR = process.env.SEC_LOG_DIR || path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'security.log');

async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function securityLog(level: 'info' | 'warn' | 'error' | 'audit', event: string, meta: Record<string, any> = {}) {
  const entry: Record<string, any> = {
    timestamp: new Date().toISOString(),
    level,
    event,
    pid: process.pid,
    ...meta,
  };

  // Create a deterministic serialized representation for signing
  const serialized = JSON.stringify(entry);

  // Add an HMAC signature if a signing secret is configured
  try {
    const secret = process.env.LOG_SIGNING_SECRET;
    if (secret) {
      const sig = createHmac('sha256', secret).update(serialized).digest('hex');
      entry.sig = sig;
    }
  } catch (e) {
    // ignore signing errors - logging should be best-effort
  }

  const line = JSON.stringify(entry) + '\n';

  try {
    await ensureLogDir();
    await fs.appendFile(LOG_FILE, line, { encoding: 'utf8' });
  } catch (e) {
    // best-effort only; still log to console
    console.error('[SECURITY_LOG_WRITE_FAILED]', e);
  }

  // Also output to console in a consistent format
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export default securityLog;
