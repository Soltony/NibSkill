
import fs from 'fs/promises';
import path from 'path';

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
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...meta,
  };

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
