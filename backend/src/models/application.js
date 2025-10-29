import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    proofImage: { type: String, required: [true, 'Proof image is required'] },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    adminNote: { type: String, default: '' },
    reward: { type: Number, required: true },
  },
  { timestamps: true }
);

// Add indexes, virtuals, etc
applicationSchema.index({ user: 1, status: 1 });
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ status: 1, createdAt: -1 });
applicationSchema.index({ job: 1, user: 1 }, { unique: true });

applicationSchema.virtual('timeSinceSubmission').get(function () {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return 'Less than 1 hour ago';
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
});

applicationSchema.set('toJSON', { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

// THIS FIXES THE OverwriteModelError:
export default mongoose.models.Application || mongoose.model('Application', applicationSchema);
