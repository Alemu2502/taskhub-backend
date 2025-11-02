import express from 'express';
import {
  createJob,
  updateJob,
  deleteJob,
  getApplications,
  reviewApplication,
  getWithdrawalRequests,
  processWithdrawal,
  rejectWithdrawal,
  getDashboardStats,
  banUser,
  getAllJobs,
  getJobById, 
  getAllUsers,
  deleteUser,
  changeUserRole 
} from '../controllers/adminController.js';
import { protect, isAdmin } from '../middleware/auth.js';


const router = express.Router();


// All routes require authentication and admin role
router.use(protect);
router.use(isAdmin);

// Dashboard Stats
router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser); // Add

// Job Management
router.get('/jobs', getAllJobs); // <-- THIS FIXES THE 404
router.post('/jobs', createJob);
router.put('/jobs/:id', updateJob);
router.delete('/jobs/:id', deleteJob);
router.get('/jobs/:id', getJobById); // <-- ADD THIS LINE!

// Application Management
router.get('/applications', getApplications);
router.put('/applications/:id', reviewApplication);

// Withdrawal Management
router.get('/withdrawals', getWithdrawalRequests);
router.put('/withdrawals/:id', processWithdrawal);
router.post('/withdrawals/:id/reject', rejectWithdrawal);
// User Management
router.put('/users/:id/ban', banUser);

export default router;
