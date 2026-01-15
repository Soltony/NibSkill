
import { randomBytes, randomInt } from 'crypto';

/**
 * Generates a cryptographically secure random password.
 * @param length The desired length of the password.
 * @returns A secure, random password string.
 */
export function generateSecurePassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
  const passwordArray = [];
  const randomBytesBuffer = randomBytes(length);

  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytesBuffer[i] % charset.length;
    passwordArray.push(charset[randomIndex]);
  }

  // Ensure the password meets complexity requirements if it doesn't by chance
  const password = passwordArray.join('');
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()]/.test(password);

  if (hasUppercase && hasLowercase && hasNumber && hasSpecial) {
    return password;
  } else {
    // If the random generation didn't meet complexity, recurse to try again.
    // This is rare but ensures compliance with password policies.
    return generateSecurePassword(length);
  }
}

/**
 * Generate a cryptographically secure integer between min and max (inclusive).
 * Uses Node's crypto.randomInt under the hood which is uniformly distributed.
 * @param min Inclusive minimum
 * @param max Inclusive maximum
 */
export function generateSecureInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new TypeError('generateSecureInt expects integer min and max');
  }
  if (min > max) {
    throw new RangeError('min must be <= max');
  }
  // crypto.randomInt generates values in [min, maxExclusive), so add 1
  return randomInt(min, max + 1);
}
