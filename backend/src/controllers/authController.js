import User from '../models/user.js';
import { generateToken } from '../middleware/auth.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';
import { getClientIP, checkDuplicateAccount, checkRegistrationRateLimit, logSuspiciousActivity } from '../utils/ipTracker.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../utils/sendEmail.js';

/**
 * @desc    Register new user
 * @route   POST /api/auth/register
 * @access  Public
 */

export const register = async (req, res) => {
  try {
    const { fullName, email, password, country, mobile, recaptchaToken } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !country || !mobile) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields',
      });
    }

    // Unique email/mobile check
    const existingUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { mobile }] });
    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return res.status(400).json({ success: false, message: 'Email already exists' });
      }
      if (existingUser.mobile === mobile) {
        return res.status(400).json({ success: false, message: 'Mobile number already exists' });
      }
    }

    // Rest of your recaptcha, IP, rate-limit, duplicateCheck...
    if (!recaptchaToken) {
      return res.status(400).json({ success: false, message: 'reCAPTCHA verification required' });
    }
    const recaptchaResult = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaResult.success) {
      await logSuspiciousActivity('FAILED_RECAPTCHA', { email, score: recaptchaResult.score, ip: getClientIP(req) });
      return res.status(400).json({ success: false, message: recaptchaResult.message });
    }
    const clientIP = getClientIP(req);
    const rateLimitCheck = checkRegistrationRateLimit(clientIP);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({ success: false, message: rateLimitCheck.message, retryAfter: rateLimitCheck.retryAfter });
    }
    const duplicateCheck = await checkDuplicateAccount(email, clientIP);
    if (duplicateCheck.isDuplicate) {
      await logSuspiciousActivity('DUPLICATE_ACCOUNT_ATTEMPT', { email, ip: clientIP, reason: duplicateCheck.reason });
      return res.status(400).json({ success: false, message: duplicateCheck.reason });
    }

    // Create user
    const user = await User.create({ fullName, email: email.toLowerCase(), password, country, mobile, registrationIP: clientIP });

    // Generate verification token
    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    sendVerificationEmail(user.email, user.fullName, verificationToken).catch(() => {});

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        token,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: messages[0] });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// Route should be: POST /api/auth/login

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 LOGIN ATTEMPT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', email);
    console.log('⏰ Timestamp:', new Date().toISOString());

    // Validate input
    if (!email || !password) {
      console.log('❌ Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user (include password for comparison)
    console.log('🔍 Searching for user in database...');
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      console.log('❌ User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User found:', {
      id: user._id,
      username: user.username,
      email: user.email,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      hasPassword: !!user.password,
      lastLoginIP: user.lastLoginIP || 'None (first login)',
    });

    // Block banned users BEFORE password check
    if (user.isBanned) {
      console.log('🚫 User is banned:', user.banReason);
      return res.status(403).json({
        success: false,
        message: `Your account has been banned. Reason: ${user.banReason || 'Violation of terms'}`,
      });
    }

    // Block unverified users BEFORE password check
    if (!user.isVerified) {
      console.log('⚠️ Email not verified');
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
      });
    }

    // Check password
    console.log('🔐 Verifying password...');
    const isPasswordCorrect = await user.comparePassword(password);
    console.log('🔐 Password match result:', isPasswordCorrect);

    if (!isPasswordCorrect) {
      console.log('❌ Password incorrect');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ Password verified successfully');

    // Check if this is first login after verification
    const isFirstLogin = !user.lastLoginIP;
    console.log('🎉 First login?', isFirstLogin);

    // Update last login IP
    const clientIP = getClientIP(req);
    console.log('🌐 Client IP:', clientIP);
    user.lastLoginIP = clientIP;
    await user.save();
    console.log('✅ User lastLoginIP updated');

    // Send welcome email on first login if not sent before
    if (isFirstLogin) {
      console.log('📨 Sending welcome email (first login)...');
      sendWelcomeEmail(user.email, user.username).catch((err) => {
        console.error('❌ Failed to send welcome email:', err.message);
      });
    }

    // Generate token
    console.log('🎫 Generating JWT token...');
    const token = generateToken(user._id);
    console.log('✅ Token generated');

    const responseData = {
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          wallet: user.wallet,
        },
      },
    };

    console.log('✅ LOGIN SUCCESSFUL');
    console.log('📤 Sending response:', {
      success: responseData.success,
      message: responseData.message,
      userId: responseData.data.user.id,
      username: responseData.data.user.username,
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(200).json(responseData);
  } catch (error) {
    console.error('❌ LOGIN ERROR:', error);
    console.error('Stack:', error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Verify email with token
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✉️ EMAIL VERIFICATION ATTEMPT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎫 Token:', token);

    // Find user with valid token
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpires: { $gt: Date.now() },
    });

    if (!user) {
      console.log('❌ Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification link. Please request a new one.',
      });
    }

    console.log('✅ User found:', user.email);

    // Verify user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();
    console.log('✅ User verified');

    // Send welcome email
    console.log('📨 Sending welcome email...');
    sendWelcomeEmail(user.email, user.username).catch((err) => {
      console.error('❌ Failed to send welcome email:', err.message);
    });

    console.log('✅ EMAIL VERIFICATION SUCCESSFUL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.',
    });
  } catch (error) {
    console.error('❌ Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during verification',
    });
  }
};

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your email address',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email',
      });
    }

    // Block banned users from requesting verification
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        message: `Your account has been banned. Reason: ${user.banReason || 'Violation of terms'}`,
      });
    }

    // Block already verified users from requesting verification again
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'This email is already verified',
      });
    }

    // Generate new token
    const crypto = await import('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    // Send verification email
    await sendVerificationEmail(user.email, user.username, verificationToken);

    res.status(200).json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

