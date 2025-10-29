import User from '../models/user.js';

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
export const getClientIP = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    'unknown'
  );
};

/**
 * Check if IP address already has an account (duplicate detection)
 * @param {string} ip - IP address to check
 * @returns {Promise<boolean>} - True if IP already used
 */
export const checkDuplicateIP = async (ip) => {
  try {
    if (ip === 'unknown') return false;

    const existingUser = await User.findOne({
      $or: [{ registrationIP: ip }, { lastLoginIP: ip }],
    });

    return !!existingUser;
  } catch (error) {
    console.error('Error checking duplicate IP:', error.message);
    return false;
  }
};

/**
 * Check for duplicate account indicators
 * Returns detailed information about potential duplicates
 */
export const checkDuplicateAccount = async (email, ip) => {
  try {
    const checks = {
      emailExists: false,
      ipExists: false,
      isDuplicate: false,
      reason: '',
    };

    // Check email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      checks.emailExists = true;
      checks.isDuplicate = true;
      checks.reason = 'Email already registered';
      return checks;
    }

    // Check IP (only if not unknown)
    if (ip !== 'unknown') {
      const ipExists = await User.findOne({
        $or: [{ registrationIP: ip }, { lastLoginIP: ip }],
      });

      if (ipExists) {
        checks.ipExists = true;
        checks.isDuplicate = true;
        checks.reason = 'IP address already used for another account';
        return checks;
      }
    }

    return checks;
  } catch (error) {
    console.error('Error checking duplicate account:', error.message);
    return {
      emailExists: false,
      ipExists: false,
      isDuplicate: false,
      reason: '',
    };
  }
};

/**
 * Log suspicious activity
 * Can be used for monitoring and analytics
 */
export const logSuspiciousActivity = async (type, details) => {
  try {
    console.warn('⚠️ SUSPICIOUS ACTIVITY DETECTED:', {
      type,
      timestamp: new Date().toISOString(),
      ...details,
    });

    // TODO: You can store this in a separate SuspiciousActivity collection
    // or send to external monitoring service (like Sentry)
  } catch (error) {
    console.error('Error logging suspicious activity:', error.message);
  }
};

/**
 * Rate limit checker by IP
 * Track registration attempts per IP
 */
const registrationAttempts = new Map();

export const checkRegistrationRateLimit = (ip, maxAttempts = 3, windowMs = 3600000) => {
  if (ip === 'unknown') return { allowed: true };

  const now = Date.now();
  const attempts = registrationAttempts.get(ip) || [];

  // Filter attempts within the time window
  const recentAttempts = attempts.filter((timestamp) => now - timestamp < windowMs);

  if (recentAttempts.length >= maxAttempts) {
    return {
      allowed: false,
      message: 'Too many registration attempts. Please try again later.',
      retryAfter: Math.ceil((recentAttempts[0] + windowMs - now) / 1000 / 60), // minutes
    };
  }

  // Add current attempt
  recentAttempts.push(now);
  registrationAttempts.set(ip, recentAttempts);

  // Cleanup old entries periodically
  if (registrationAttempts.size > 10000) {
    const oldestAllowed = now - windowMs;
    for (const [key, value] of registrationAttempts.entries()) {
      const validAttempts = value.filter((timestamp) => timestamp > oldestAllowed);
      if (validAttempts.length === 0) {
        registrationAttempts.delete(key);
      } else {
        registrationAttempts.set(key, validAttempts);
      }
    }
  }

  return { allowed: true };
};

export default {
  getClientIP,
  checkDuplicateIP,
  checkDuplicateAccount,
  logSuspiciousActivity,
  checkRegistrationRateLimit,
};