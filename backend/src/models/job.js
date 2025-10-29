import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: [true, 'Job title is required'], trim: true },
    reward: { type: Number, required: [true, 'Reward amount is required'], min: [0.01, 'Reward must be at least $0.01'] },
    platform: { type: String, required: [true, 'Platform is required'], enum: ['youtube', 'tiktok', 'instagram', 'facebook', 'twitter', 'telegram', 'other'] },
    totalSlots: { type: Number, required: [true, 'Total slots is required'], min: [1, 'Must have at least 1 slot'] },
    filledSlots: { type: Number, default: 0 },
    instructions: { type: String, required: [true, 'Instructions are required'] },
    image: { type: String },
    proofRequired: { type: Boolean, default: true },
    status: { type: String, enum: ['active', 'paused', 'completed', 'expired'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

jobSchema.virtual('remainingSlots').get(function () {
  return this.totalSlots - this.filledSlots;
});
jobSchema.virtual('isFull').get(function () {
  return this.filledSlots >= this.totalSlots;
});

jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

// THIS FIXES THE OverwriteModelError:
export default mongoose.models.Job || mongoose.model('Job', jobSchema);
