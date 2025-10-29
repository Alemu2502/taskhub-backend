
import express from 'express';
import Application from '../models/application.js'; 

const router = express.Router();

// POST /api/applications/submit (example path)
router.post('/submit', /* uploadSingle('proofImage'), */ async (req, res) => {
  try {
    const userId = req.user._id; // must be set by your auth middleware
    const { jobId, ...otherFields } = req.body;

    // Check if this user already applied for this job (Mongoose)
    const already = await Application.findOne({ user: userId, job: jobId });
    if (already) {
      // BLOCK and send clear UX message!
      return res.status(400).json({
        success: false,
        message: "You already done this job. Browse new jobs."
      });
    }

    // If not already applied, allow submission
    const application = new Application({
      user: userId,
      job: jobId,
      ...otherFields,
      // proofImage: req.file ? req.file.filename : undefined // if using file upload
    });
    await application.save();

    res.json({ success: true, message: "Application submitted!", data: application });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to submit application", error: err.message });
  }
});

export default router;
