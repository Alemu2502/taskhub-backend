import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    proofUrl: {
      type: String,
      required: true,
    },
    proofDescription: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reward: {
      type: Number,
      required: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: {
      type: Date,
    },
    adminNote: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
submissionSchema.index({ user: 1, job: 1 });
submissionSchema.index({ status: 1 });

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;