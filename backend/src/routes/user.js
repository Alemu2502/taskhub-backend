import express from 'express';
import { getWallet, requestWithdrawal, getWithdrawals, getProfile, updateProfile, getUserStats, getReferrals} from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';
import User from '../models/user.js';

const router = express.Router();

// All routes are protected (require login)
router.use(protect);

// @route   GET /api/user/profile
// @desc    Get user profile
// @access  Private
router.get('/profile', getProfile);

// @route   PUT /api/user/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', updateProfile);
router.get('/stats', protect, getUserStats);
// @route   GET /api/user/wallet
// @desc    Get wallet balance
// @access  Private
router.get('/wallet', getWallet);

// @route   POST /api/user/withdraw
// @desc    Request withdrawal
// @access  Private
router.post('/withdraw', requestWithdrawal);

// @route   GET /api/user/withdrawals
// @desc    Get withdrawal history
// @access  Private
router.get('/withdrawals', getWithdrawals);

router.get('/referrals', protect, getReferrals);

// GET /api/user  (admin only)
router.get('/', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admins only.' });
  }
  const users = await User.find();
  res.json(users);
});

export default router;