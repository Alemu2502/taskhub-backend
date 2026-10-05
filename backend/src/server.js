import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import jobsRoutes from './routes/jobs.js';
import userRoutes from './routes/user.js';
import adminRoutes from './routes/admin.js';
import applicationRoutes from './routes/application.js';
import contactRoute from './routes/contact.js';
import authRouter from './routes/auth.js';
import { publicRouter as blogsRouter, adminRouter as adminBlogsRouter } from './routes/blogs.js';
import { startUnverifiedUserCleanup } from "./controllers/autoCleanUnverifiedUsers.js";
import notificationsRouter from "./routes/notification.js";








// Load environment variables
dotenv.config();

// ES Module __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express
const app = express();

// Connect to MongoDB
connectDB();
app.use(express.json({ limit: '5mb' })); // Or higher for demo (backend)

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api/applications', applicationRoutes);

// API Routes
app.use('/api', contactRoute);
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRouter);
app.use('/api/admin/blogs', adminBlogsRouter);
app.use('/api/blogs', blogsRouter);
app.use("/api/notifications", notificationsRouter);
console.log("\nALL ROUTES:");
app._router.stack.forEach(function(r){
  if (r.route && r.route.path){
    console.log(r.route.path);
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TaskHub API is running! 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to TaskHub API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      jobs: '/api/jobs',
      user: '/api/user',
      admin: '/api/admin',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 TaskHub Backend Server Started!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log(`   • Auth:  http://localhost:${PORT}/api/auth`);
  console.log(`   • Jobs:  http://localhost:${PORT}/api/jobs`);
  console.log(`   • User:  http://localhost:${PORT}/api/user`);
  console.log(`   • Admin: http://localhost:${PORT}/api/admin`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err.message);
  // Close server & exit process
  process.exit(1);
});
startUnverifiedUserCleanup();