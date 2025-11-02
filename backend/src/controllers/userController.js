import User from '../models/user.js';
import Withdrawal from '../models/withdrawal.js';
import { sendWithdrawalRequestEmail } from '../utils/sendEmail.js';
import Application from '../models/application.js';

// // Returns all wallet and job stats for the logged-in user

export const getUserStats = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get the logged-in user's wallet data directly
    const user = await User.findById(userId);

    // Application status counts (for dashboard breakdown)
    const applications = await Application.find({ user: userId });
    const approved = applications.filter(app => (app.status || '').toLowerCase() === 'approved').length;
    const pending  = applications.filter(app => (app.status || '').toLowerCase() === 'pending').length;
    const rejected = applications.filter(app => (app.status || '').toLowerCase() === 'rejected').length;

    res.json({
      success: true,
      data: {
        wallet: {
          balance: user.wallet?.balance || 0,
          totalEarned: user.wallet?.totalEarned || 0,
          totalWithdrawn: user.wallet?.totalWithdrawn || 0,
        },
        applications: {
          total: applications.length,
          approved,
          pending,
          rejected,
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
};


export const getWallet = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('wallet username email');

    res.status(200).json({
      success: true,
      data: {
        balance: user.wallet.balance,
        totalEarned: user.wallet.totalEarned,
        totalWithdrawn: user.wallet.totalWithdrawn,
      },
    });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Request withdrawal
 * @route   POST /api/user/withdraw
 * @access  Private
 */
export const requestWithdrawal = async (req, res) => {
  try {
    const { amount, method, accountDetails } = req.body;

    // Validate required fields
    if (!amount || !method || !accountDetails) {
      return res.status(400).json({
        success: false,
        message: 'Please provide amount, method, and account details',
      });
    }

    // Validate amount
    if (amount < 1) {
      return res.status(400).json({
        success: false,
        message: 'Minimum withdrawal amount is $1.00',
      });
    }

    // Validate method
    const validMethods = ['bep20', 'telebirr', 'cbe'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid withdrawal method',
      });
    }

    // Get user
    const user = await User.findById(req.user.id);

    // Check if user has enough balance
    if (user.wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Your current balance is $${user.wallet.balance.toFixed(2)}`,
      });
    }

    // Create withdrawal request
    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount,
      method,
      accountDetails,
      status: 'pending',
    });

    // Deduct from user balance
    user.wallet.balance -= amount;
    await user.save();

    // Send email notification (don't wait)
    sendWithdrawalRequestEmail(user.email, user.fullName, amount, method).catch((err) => {
      console.error('Failed to send withdrawal email:', err.message);
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully. Processing may take 1-7 business days.',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Withdrawal request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get user's withdrawal history
 * @route   GET /api/user/withdrawals
 * @access  Private
 */
export const getWithdrawals = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { user: req.user.id };
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await Withdrawal.find(filter)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('processedBy', 'username');

    const total = await Withdrawal.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/user/profile
 * @access  Private
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

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
 * @desc    Update user profile
 * @route   PUT /api/user/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { mobile, country } = req.body;

    const user = await User.findById(req.user.id);

    if (mobile) user.mobile = mobile;
    if (country) user.country = country;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// In your /api/user/referrals backend controller
export const  getReferrals = async (req, res) => {
  try {
    console.log('getReferrals called, req.user:', req.user);
    const currentUser = await User.findById(req.user._id);
    console.log('Database User:', currentUser);
    console.log('User\'s referralCode:', currentUser.referralCode);

    const referrals = await User.find({ referredBy: currentUser.referralCode });
    console.log('Referrals found in DB:', referrals);

    return res.status(200).json({
      success: true,
      data: referrals
    });
  } catch (err) {
    console.error('getReferrals error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};




export default { getWallet, requestWithdrawal, getWithdrawals, getProfile, updateProfile, getUserStats, getReferrals};