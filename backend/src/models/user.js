// import mongoose from 'mongoose';
// import bcrypt from 'bcrypt';

// const userSchema = new mongoose.Schema({
//   fullName: {
//     type: String,
//     required: [true, 'Full Name is required. This must match your payout account name!'],
//     trim: true,
//     minlength: [5, 'Full Name must be at least 5 characters'],
//     maxlength: [40, 'Full Name must not exceed 40 characters'],
//     match: [/^[a-zA-Z\s\-'.]+$/, 'Full Name can only contain letters, spaces, dashes, apostrophes, and dots'],
//   },
//   email: {
//     type: String,
//     required: [true, 'Email is required'],
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [
//       /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
//       'Please provide a valid email address',
//     ],
//   },
//   password: {
//     type: String,
//     required: [true, 'Password is required'],
//     minlength: [8, 'Password must be at least 8 characters'],
//     select: false,
//   },
//   country: {
//     type: String,
//     required: [true, 'Country is required'],
//     trim: true,
//   },
//   mobile: {
//     type: String,
//     required: [true, 'Mobile number is required. This must be your Telebirr number if using Telebirr.'],
//     trim: true,
//     unique: true,
//   },
//   role: {
//     type: String,
//     enum: ['user', 'admin'],
//     default: 'user',
//   },
//   wallet: {
//     type: {
//       balance: { type: Number, default: 0, min: 0 },
//       totalEarned: { type: Number, default: 0, min: 0 },
//       totalWithdrawn: { type: Number, default: 0, min: 0 },
//     },
//     default: () => ({
//       balance: 0,
//       totalEarned: 0,
//       totalWithdrawn: 0,
//     }),
//   },
//   isVerified: { type: Boolean, default: false },
//   verificationToken: String,
//   verificationTokenExpires: Date,
//   isBanned: { type: Boolean, default: false },
//   banReason: String,
//   registrationIP: String,
//   lastLoginIP: String,
// }, { timestamps: true });

// userSchema.pre('save', function (next) {
//   if (!this.wallet || Object.keys(this.wallet).length === 0) {
//     this.wallet = { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
//   }
//   next();
// });
// userSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   try {
//     const password = this.password;
//     if (!password.startsWith('$2b$')) {
//       const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
//       if (!passwordRegex.test(password)) {
//         const error = new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, one special character (@$!%*?&#), and be at least 8 characters long');
//         return next(error);
//       }
//     }
//     const salt = await bcrypt.genSalt(10);
//     this.password = await bcrypt.hash(this.password, salt);
//     next();
//   } catch (error) {
//     next(error);
//   }
// });
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   try {
//     return await bcrypt.compare(candidatePassword, this.password);
//   } catch {
//     return false;
//   }
// };
// const User = mongoose.model('User', userSchema);
// export default User;

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// --- Numeric Referral Code Generator ---
async function generateUniqueNumericCode(model, length = 7) {
  let code, exists;
  do {
    code = Math.floor(Math.pow(10, length-1) + Math.random() * 9 * Math.pow(10, length-1)).toString();
    exists = await model.findOne({ referralCode: code });
  } while (exists);
  return code;
}

// --- User Schema ---
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full Name is required. This must match your payout account name!'],
    trim: true,
    minlength: [5, 'Full Name must be at least 5 characters'],
    maxlength: [40, 'Full Name must not exceed 40 characters'],
    match: [/^[a-zA-Z\s\-'.]+$/, 'Full Name can only contain letters, spaces, dashes, apostrophes, and dots'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email address',
    ],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  country: { type: String, required: [true, 'Country is required'], trim: true },
  mobile: {
    type: String,
    required: [true, 'Mobile number is required. This must be your Telebirr number if using Telebirr.'],
    trim: true,
    unique: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  wallet: {
    type: {
      balance: { type: Number, default: 0, min: 0 },
      totalEarned: { type: Number, default: 0, min: 0 },
      totalWithdrawn: { type: Number, default: 0, min: 0 },
    },
    default: () => ({
      balance: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
    }),
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date,
  isBanned: { type: Boolean, default: false },
  banReason: String,
  registrationIP: String,
  lastLoginIP: String,

  // --- Referral System ---
  // 7-digit numeric referral code, guaranteed unique!
  referralCode: {
    type: String,
    unique: true,
    required: true
  },
  referredBy: { type: String, default: null }, // stores referralCode of inviter
  referralBonusPaid: { type: Boolean, default: false }
  // -----------------------
}, { timestamps: true });

// Generate unique numeric code before save/validation
// Retry referral code until success or 5 attempts
userSchema.pre('validate', async function (next) {
  if (this.referralCode) return next();
  let code, exists, tries = 0;
  const maxTries = 5;
  do {
    code = Math.floor(Math.pow(10, 6) + Math.random() * 9 * Math.pow(10, 6)).toString();
    exists = await mongoose.models.User.findOne({ referralCode: code });
    tries++;
  } while (exists && tries < maxTries);

  if (exists) {
    // Extremely rare case: couldn't find a unique code after several attempts
    return next(new Error("Could not generate a unique referral code, please try again."));
  }
  this.referralCode = code;
  next();
});


// --- Wallet Initializer ---
userSchema.pre('save', function (next) {
  if (!this.wallet || Object.keys(this.wallet).length === 0) {
    this.wallet = { balance: 0, totalEarned: 0, totalWithdrawn: 0 };
  }
  next();
});

// --- Password Hashing ---
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const password = this.password;
    if (!password.startsWith('$2b$')) {
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passwordRegex.test(password)) {
        const error = new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, one special character (@$!%*?&#), and be at least 8 characters long');
        return next(error);
      }
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch {
    return false;
  }
};

const User = mongoose.model('User', userSchema);
export default User;
