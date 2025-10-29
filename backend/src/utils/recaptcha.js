import axios from 'axios';

/**
 * Verify Google reCAPTCHA v3 token
 * @param {string} token - The reCAPTCHA token from frontend
 * @returns {Promise<Object>} - Verification result
 */
export const verifyRecaptcha = async (token) => {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;

    if (!secretKey) {
      throw new Error('reCAPTCHA secret key not configured');
    }

    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
      }
    );

    const { success, score, action, challenge_ts, hostname } = response.data;

    // reCAPTCHA v3 returns a score (0.0 - 1.0)
    // Higher score = more likely human
    // Lower score = more likely bot

    if (!success) {
      return {
        success: false,
        message: 'reCAPTCHA verification failed',
        score: 0,
      };
    }

    // Score threshold (0.5 is recommended, adjust as needed)
    const MINIMUM_SCORE = 0.5;

    if (score < MINIMUM_SCORE) {
      return {
        success: false,
        message: 'Suspicious activity detected. Please try again.',
        score,
      };
    }

    return {
      success: true,
      message: 'reCAPTCHA verification passed',
      score,
      action,
      timestamp: challenge_ts,
      hostname,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    return {
      success: false,
      message: 'reCAPTCHA verification error',
      error: error.message,
    };
  }
};

export default verifyRecaptcha;