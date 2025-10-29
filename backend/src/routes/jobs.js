import express from 'express';
import { getJobs, getJobById, applyForJob, getMyApplications } from '../controllers/jobsController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// @route   GET /api/jobs
// @desc    Get all active jobs (with filters)
// @access  Public
router.get('/', getJobs);

// @route   GET /api/jobs/my-applications
// @desc    Get user's applications
// @access  Private
router.get('/my-applications', protect, getMyApplications);

// @route   GET /api/jobs/:id
// @desc    Get single job by ID
// @access  Public
router.get('/:id', getJobById);

// @route   POST /api/jobs/:id/apply
// @desc    Apply for a job (with proof image)
// @access  Private
router.post('/:id/apply', protect, uploadSingle('proof'), applyForJob);

export default router;

