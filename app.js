const express = require('express');
const mongoose = require('mongoose');
const { connectDB, isConnected } = require('./config/database');

// Import models to ensure they're registered
require('./models/Agent');
require('./models/User');
require('./models/Account');
require('./models/LOB');
require('./models/Carrier');
require('./models/Policy');
require('./models/Message');

// Import routes
const uploadRoutes = require('./routes/upload');
const policyRoutes = require('./routes/policy');
const systemRoutes = require('./routes/system');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.use('/upload', uploadRoutes);
app.use('/policy', policyRoutes);
app.use('/system', systemRoutes);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Node.js Assessment API is running.',
    status: 'Server is working',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    endpoints: {
      upload: '/upload',
      policy: '/policy',
      system: '/system'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: [
      'GET /',
      'POST /upload',
      'GET /policy/search?username=...',
      'GET /policy/aggregate',
      'GET /policy?page=1&limit=10',
      'GET /system/cpu',
      'POST /system/schedule-message',
      'GET /system/scheduled-messages',
      'DELETE /system/scheduled-messages/:id'
    ]
  });
});

// Connect to MongoDB and start server
const startServer = async () => {
  console.log('🔌 Attempting to connect to database...');
  const dbConnected = await connectDB();
  
  if (dbConnected) {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log('✅ All systems are working correctly!');
      console.log('\n📋 Available endpoints:');
      console.log('  GET  / - Health check');
      console.log('  POST /upload - Upload CSV/XLSX files');
      console.log('  GET  /policy/search?username=... - Search policies by username');
      console.log('  GET  /policy/aggregate - Get aggregated policies by user');
      console.log('  GET  /policy - Get all policies with pagination');
      console.log('  GET  /system/cpu - Get CPU usage');
      console.log('  POST /system/schedule-message - Schedule a message');
      console.log('  GET  /system/scheduled-messages - Get all scheduled messages');
      console.log('  DELETE /system/scheduled-messages/:id - Cancel a scheduled message');
    });
  } else {
    console.log('⚠️  Database connection failed, but starting server in limited mode...');
    console.log('📝 Some features will be disabled without database connection');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (Limited Mode)`);
      console.log('⚠️  Database features disabled - only basic endpoints available');
      console.log('\n📋 Available endpoints (Limited Mode):');
      console.log('  GET  / - Health check');
      console.log('  GET  /system/cpu - Get CPU usage');
      console.log('\n💡 To enable full features:');
      console.log('1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/');
      console.log('2. Or use MongoDB Atlas: https://www.mongodb.com/atlas');
      console.log('3. Update config/database.js to use "atlas" as default');
    });
  }
};

startServer(); 