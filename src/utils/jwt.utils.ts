import argon2 from 'argon2'

/**
 * Generate a cryptographically secure device fingerprint
 * Uses argon2 for hashing for consistency with password hashing
 */
export async function generateDeviceFingerprint(
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const baseString = `${userAgent || 'unknown'}-${ipAddress || 'unknown'}-${Date.now()}`

  // Use argon2 for cryptographically secure hashing
  // Using lower cost parameters for device fingerprinting (performance)
  return argon2.hash(baseString, {
    type: argon2.argon2id,
    timeCost: 2,
    memoryCost: 2 ** 16,
    parallelism: 1
  })
}

/**
 * Parse expiration time string to seconds
 * Examples: '15m' -> 900, '7d' -> 604800, '1h' -> 3600
 */
export function parseExpirationToSeconds(expiration: string): number {
  const units: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 60 * 60 * 24,
    w: 60 * 60 * 24 * 7
  }

  const match = expiration.match(/^(\d+)([smhdw])$/)
  if (!match) {
    throw new Error(`Invalid expiration format: ${expiration}`)
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  return value * units[unit]
}

/**
 * Extract JWT from request (cookie or Authorization header)
 */
export function extractToken(
  cookies: Record<string, string | undefined>,
  authHeader?: string
): string | null {
  // Try cookie first
  if (cookies.access_token) {
    return cookies.access_token
  }

  // Try Authorization header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  return null
}

/**
 * Calculate token expiration date from expiration string
 */
export function calculateExpirationDate(expirationString: string): Date {
  const seconds = parseExpirationToSeconds(expirationString)
  return new Date(Date.now() + seconds * 1000)
}
