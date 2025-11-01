import Job from '../models/job.js';
import Application from '../models/application.js';

// GET /api/jobs
export const getJobs = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { instructions: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    const total = await Job.countDocuments(filter);
    return res.status(200).json({
      success: true,
      data: jobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc   Get single job by ID (with creator's full name)
 * @route  GET /api/jobs/:id
 * @access Public
 */
export const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('createdBy', 'fullName');
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc   Apply for a job
 * @route  POST /api/jobs/:id/apply
 * @access Private
 */
export const applyForJob = async (req, res) => {
  try {
    const { notes } = req.body;
    const jobId = req.params.id;
    const userId = req.user.id;
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }
    if (job.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This job is no longer active' });
    }
    if (job.isFull) {
      return res.status(400).json({ success: false, message: 'This job has reached maximum applications' });
    }
    if (typeof job.isExpired === 'function' && job.isExpired()) {
      job.status = 'expired';
      await job.save();
      return res.status(400).json({ success: false, message: 'This job has expired' });
    }
    const existingApplication = await Application.findOne({ job: jobId, user: userId });
    if (existingApplication) {
      return res.status(400).json({ success: false, message: 'You have already applied for this job' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Proof image is required' });
    }
    const application = await Application.create({
      job: jobId,
      user: userId,
      proofImage: req.file.filename,
      notes: notes || '',
      reward: job.reward,
    });
    job.filledSlots += 1;
    await job.save();
    await application.populate('job', 'title reward');
    await application.populate('user', 'fullName email');
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! Wait for admin approval.',
      data: application,
    });
  } catch (error) {
    console.error('Apply job error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job',
      });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * @desc   Get user's applications
 * @route  GET /api/jobs/my-applications
 * @access Private
 */
export const getMyApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { user: req.user.id };
    if (status) filter.status = status;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('job', 'title platform reward')
      .populate('reviewedBy', 'fullName');
      
  //   const applications = await Application.find(filter)
  // .sort({ createdAt: -1 })
  // .skip(skip)
  // .limit(parseInt(limit))
  // .populate({
  //   path: 'job',
  //   select: 'title platform reward createdBy createdAt', // <-- Add createdAt to select!
  //   populate: { path: 'createdBy', select: 'fullName' }
  // })
  // .populate('reviewedBy', 'fullName');

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
    console.error('Get my applications error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default {
  getJobs,
  getJobById,
  applyForJob,
  getMyApplications,
};
