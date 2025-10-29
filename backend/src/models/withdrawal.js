import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Withdrawal amount is required'],
      min: [1, 'Minimum withdrawal is $1.00'],
    },
    method: {
      type: String,
      required: [true, 'Withdrawal method is required'],
      enum: ['bep20', 'telebirr', 'cbe'],
    },
    accountDetails: {
      type: String,
      required: [true, 'Account details are required'],
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    adminNote: {
      type: String,
      default: '',
    },
    transactionHash: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Index for better performance
withdrawalSchema.index({ user: 1, status: 1 });
withdrawalSchema.index({ status: 1, requestedAt: -1 });

// Virtual for method label
withdrawalSchema.virtual('methodLabel').get(function () {
  const labels = {
    bep20: 'BEP20 Crypto (USDT/BUSD)',
    telebirr: 'Telebirr',
    cbe: 'CBE Bank',
  };
  return labels[this.method] || this.method.toUpperCase();
});

// Virtual for formatted account details
withdrawalSchema.virtual('formattedAccountDetails').get(function () {
  if (this.method === 'bep20') {
    // Mask wallet address (show first 6 and last 4 characters)
    if (this.accountDetails.length > 10) {
      return `${this.accountDetails.substring(0, 6)}...${this.accountDetails.substring(this.accountDetails.length - 4)}`;
    }
  }
  return this.accountDetails;
});

// Virtual for processing time
withdrawalSchema.virtual('processingTime').get(function () {
  if (!this.processedAt) return null;
  
  const diff = this.processedAt - this.requestedAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  if (hours < 1) return 'Less than 1 hour';
  if (hours === 1) return '1 hour';
  if (hours < 24) return `${hours} hours`;
  
  const days = Math.floor(hours / 24);
  if (days === 1) return '1 day';
  return `${days} days`;
});

// Ensure virtuals are included
withdrawalSchema.set('toJSON', { virtuals: true });
withdrawalSchema.set('toObject', { virtuals: true });

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;