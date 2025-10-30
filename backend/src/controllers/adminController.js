import User from '../models/user.js';
import Job from '../models/job.js';
import Application from '../models/application.js';
import Withdrawal from '../models/withdrawal.js';
import { sendJobAddedNotification, sendWithdrawalCompletedEmail } from '../utils/sendEmail.js'; // import the template sender



const handleReferralPayout = async (userId) => {
  const user = await User.findById(userId);
  if (
    user &&
    user.referredBy &&
    !user.referralBonusPaid &&
    user.isVerified &&
    (user.wallet?.totalEarned ?? 0) >= 0.01
  ) {
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (referrer) {
      referrer.wallet.balance += 0.01;
      referrer.wallet.totalEarned += 0.01;
      await referrer.save();
    }
    user.referralBonusPaid = true;
    await user.save();
  }
};


export const createJob = async (req, res) => {
  try {
    const { title, platform, reward, totalSlots, proofRequired, instructions, image } = req.body;

    const job = await Job.create({
      title,
      platform,
      reward,
      totalSlots,
      proofRequired: proofRequired !== false,
      instructions,
      image,
      createdBy: req.user && req.user.id,
    });

    // 1️⃣ Log before fetching users
    console.log('--- Notifying users about new job ---');

  const users = await User.find({
  isVerified: true,
  isBanned: false,
  role: 'user'
}, 'email');

console.log('Total users to notify:', users.length);

for (const user of users) {
  console.log(`SENDING TO: ${user.email}`);
  await sendJobAddedNotification(job, user.email);
}

    res.status(201).json({
      success: true,
      message: `Job created. Tried to notify ${users.length} users.`,
      data: job,
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// Add this function to your adminController.js file
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Update job (Admin only)
 * @route   PUT /api/admin/jobs/:id
 * @access  Private/Admin
 */
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const { title, description, status, reward, totalSlots, expiresAt, instructions, platform, category, proofRequired, url } = req.body;

if (title !== undefined) job.title = title;
if (description !== undefined) job.description = description;
if (status !== undefined) job.status = status;
if (reward !== undefined) job.reward = reward;
if (totalSlots !== undefined) job.totalSlots = totalSlots;
if (expiresAt !== undefined) job.expiresAt = expiresAt;
if (instructions !== undefined) job.instructions = instructions;
if (platform !== undefined) job.platform = platform;
if (category !== undefined) job.category = category;
if (proofRequired !== undefined) job.proofRequired = proofRequired;
if (url !== undefined) job.url = url;

    await job.save();

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Delete job (Admin only)
 * @route   DELETE /api/admin/jobs/:id
 * @access  Private/Admin
 */
export const deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    await job.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc    Get all applications (Admin only)
 * @route   GET /api/admin/applications
 * @access  Private/Admin
 */
export const getApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'fullName email')
      .populate('job', 'title reward')
      .populate('reviewedBy', 'fullName');

    const total = await Application.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Review application (Approve/Reject)
 * @route   PUT /api/admin/applications/:id
 * @access  Private/Admin
 */
// export const reviewApplication = async (req, res) => {
//   try {
//     const { status, adminNote } = req.body;

//     if (!status || !['approved', 'rejected'].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status. Use "approved" or "rejected"',
//       });
//     }

//     const application = await Application.findById(req.params.id).populate('user');

//     if (!application) {
//       return res.status(404).json({
//         success: false,
//         message: 'Application not found',
//       });
//     }

//     if (application.status !== 'pending') {
//       return res.status(400).json({
//         success: false,
//         message: 'This application has already been reviewed',
//       });
//     }

//     // Update application
//     application.status = status;
//     application.reviewedBy = req.user.id;
//     application.reviewedAt = new Date();
//     application.adminNote = adminNote || '';
//     await application.save();

//     // If approved, add reward to user wallet
//     if (status === 'approved') {
//       const user = await User.findById(application.user._id);
//       user.wallet.balance += application.reward;
//       user.wallet.totalEarned += application.reward;
//       await user.save();
//     }

//     res.status(200).json({
//       success: true,
//       message: `Application ${status} successfully`,
//       data: application,
//     });
//   } catch (error) {
//     console.error('Review application error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error',
//     });
//   }
// };

export const reviewApplication = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "approved" or "rejected"',
      });
    }

    const application = await Application.findById(req.params.id).populate('user');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (application.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This application has already been reviewed',
      });
    }

    // Update application
    application.status = status;
    application.reviewedBy = req.user.id;
    application.reviewedAt = new Date();
    application.adminNote = adminNote || '';
    await application.save();

    // If approved, add reward to user wallet and trigger referral payout
    if (status === 'approved') {
      const user = await User.findById(application.user._id);
      user.wallet.balance += application.reward;
      user.wallet.totalEarned += application.reward;
      await user.save();

      // Add this line for referral bonus (AFTER user wallet is updated)
      await handleReferralPayout(user._id);
    }

    res.status(200).json({
      success: true,
      message: `Application ${status} successfully`,
      data: application,
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


/**
 * @desc    Get all withdrawal requests (Admin only)
 * @route   GET /api/admin/withdrawals
 * @access  Private/Admin
 */
export const getWithdrawalRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const withdrawals = await Withdrawal.find(filter)
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('user', 'fullName email')
      .populate('processedBy', 'fullName');

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


export const processWithdrawal = async (req, res) => {
  try {
    const { status, adminNote, transactionHash } = req.body;

    if (!status || !['processing', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    // Populate user fields for email
    const withdrawal = await Withdrawal.findById(req.params.id).populate('user', 'email fullName');

    if (!withdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found',
      });
    }

    // Update withdrawal
    withdrawal.status = status;
    withdrawal.processedBy = req.user.id;
    withdrawal.processedAt = new Date();
    withdrawal.adminNote = adminNote || '';
    if (transactionHash) {
      withdrawal.transactionHash = transactionHash;
    }
    await withdrawal.save();

    // If rejected, refund the balance
    if (status === 'rejected') {
      const user = await User.findById(withdrawal.user._id);
      user.wallet.balance += withdrawal.amount;
      await user.save();
    }

    // If completed, update totalWithdrawn and SEND EMAIL NOTIFICATION
    if (status === 'completed') {
      const user = await User.findById(withdrawal.user._id);
      user.wallet.totalWithdrawn += withdrawal.amount;
      await user.save();

      // 🟢 Send completion email notification!
      if (withdrawal.user.email && withdrawal.user.fullName) {
        await sendWithdrawalCompletedEmail(
          withdrawal.user.email,
          withdrawal.user.fullName,
          withdrawal.amount,
          withdrawal.method
        );
        console.log('✅ Withdrawal completion email sent to:', withdrawal.user.email);
      } else {
        console.error('❌ No email/fullName on user, completion email not sent:', withdrawal.user);
      }
    }

    res.status(200).json({
      success: true,
      message: `Withdrawal ${status} successfully`,
      data: withdrawal,
    });
  } catch (error) {
    console.error('Process withdrawal error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


/**
 * @desc    Get admin dashboard stats
 * @route   GET /api/admin/stats
 * @access  Private/Admin
 */
export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalJobs,
      activeJobs,
      pendingApplications,
      approvedApplications,
      pendingWithdrawals,
      totalEarningsPaid,
    ] = await Promise.all([
      User.countDocuments(),
      Job.countDocuments(),
      Job.countDocuments({ status: 'active' }),
      Application.countDocuments({ status: 'pending' }),
      Application.countDocuments({ status: 'approved' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
        },
        applications: {
          pending: pendingApplications,
          approved: approvedApplications,
        },
        withdrawals: {
          pending: pendingWithdrawals,
        },
        earnings: {
          totalPaid: totalEarningsPaid[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Ban/Unban user (Admin only)
 * @route   PUT /api/admin/users/:id/ban
 * @access  Private/Admin
 */
export const banUser = async (req, res) => {
  try {
    const { isBanned, banReason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isBanned = isBanned;
    user.banReason = isBanned ? banReason : '';
    await user.save();

    res.status(200).json({
      success: true,
      message: isBanned ? 'User banned successfully' : 'User unbanned successfully',
      data: user,
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

export const changeUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (!req.body.role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }
    user.role = req.body.role;
    await user.save();
    res.status(200).json({ success: true, message: 'Role updated successfully', data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  createJob,
  getAllUsers,
  updateJob,
  deleteJob,
  getApplications,
  reviewApplication,
  getWithdrawalRequests,
  processWithdrawal,
  getDashboardStats,
  banUser,
  changeUserRole,
};