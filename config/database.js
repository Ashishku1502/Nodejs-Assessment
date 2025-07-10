const mongoose = require('mongoose');

// Database configuration
const config = {
  // Local MongoDB (uncomment if you have MongoDB installed locally)
  local: 'mongodb://localhost:27017/nodejs_assessment',
  
  // MongoDB Atlas (replace with your actual connection string)
  // Get free MongoDB Atlas: https://www.mongodb.com/atlas
  atlas: 'mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/nodejs_assessment?retryWrites=true&w=majority',
  
  // Default connection (change to 'atlas' for cloud database)
  default: 'local'
};

// Check if database is connected
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

const connectDB = async () => {
  try {
    const uri = config[config.default];
    
    // Add connection options for better reliability
    const options = {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };
    
    await mongoose.connect(uri, options);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    
    // Try local connection as fallback if atlas fails
    if (config.default === 'atlas') {
      console.log('🔄 Attempting to connect to local MongoDB as fallback...');
      try {
        const localOptions = {
          serverSelectionTimeoutMS: 3000,
        };
        await mongoose.connect(config.local, localOptions);
        console.log('✅ Connected to local MongoDB successfully');
        return true;
      } catch (localError) {
        console.error('❌ Local MongoDB connection also failed:', localError.message);
      }
    }
    
    console.log('\nTo fix this issue:');
    console.log('1. Install MongoDB locally: https://docs.mongodb.com/manual/installation/');
    console.log('2. Or use MongoDB Atlas: https://www.mongodb.com/atlas');
    console.log('3. Update the connection string in config/database.js');
    console.log('4. Set MONGO_URI environment variable for Atlas connection');
    return false;
  }
};

module.exports = { connectDB, config, isConnected }; 