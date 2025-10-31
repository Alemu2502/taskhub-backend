import express from 'express';
import { register, login, getMe, verifyEmail, resendVerification } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';
import { sendEmail } from '../utils/sendEmail.js';
import User from '../models/user.js'; 
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();  

const router = express.Router();

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per window
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});


router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required.' });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: 'No user found with that email.' });
  if (user.isBanned) return res.status(403).json({ message: 'Banned users cannot reset password.' });
  if (!user.isVerified) return res.status(403).json({ message: 'You must verify your email before resetting password.' });

  // Generate reset token (expires in 1 hour)
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetToken = resetToken;
  user.resetTokenExpires = Date.now() + 60 * 60 * 1000;
  await user.save();

  // Build link
  const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

  // Email content
  const htmlContent = `
    <h2>Hello ${user.fullName || ''},</h2>
    <p>We received a request to reset your TaskHub password. Click the button below to set a new password. <b>This link will expire after 1 hour.</b> </p>
    <p style="text-align:center;"><a href="${resetLink}" style="background:#235eaa;color:#fff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;">Reset Password</a></p>
    <p>If you didn't request this, please ignore this email.</p>
    <p>Regards,<br/>TaskHub Team</p>
  `;

  // Send email using your Brevo-powered sendEmail()
  const sendResult = await sendEmail(
    user.email,
    'Reset Your TaskHub Password',
    htmlContent
  );

  if (sendResult.success) {
    return res.json({ message: 'Reset link sent to your email.' });
  } else {
    return res.status(500).json({ message: 'Failed to send reset email', error: sendResult.error });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token.' });
    }
    if (user.isBanned) return res.status(403).json({ message: 'Banned users cannot reset password.' });
    if (!user.isVerified) return res.status(403).json({ message: 'You must verify your email before resetting password.' });

    // Update password and clear reset token
    user.password = password; // Make sure your User model hashes this
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', authLimiter, register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, getMe);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email with token
// @access  Public
router.get('/verify-email/:token', verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', authLimiter, resendVerification);

export default router;
