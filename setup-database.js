#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Database Setup for Node.js Assessment\n');

console.log('Choose your database option:\n');
console.log('1. Use MongoDB Atlas (Recommended - No installation required)');
console.log('2. Use Local MongoDB (Requires MongoDB installation)');
console.log('3. Skip database setup (Run in limited mode)\n');

rl.question('Enter your choice (1-3): ', (choice) => {
  switch (choice.trim()) {
    case '1':
      setupAtlas();
      break;
    case '2':
      setupLocal();
      break;
    case '3':
      setupLimited();
      break;
    default:
      console.log('❌ Invalid choice. Please run the script again.');
      rl.close();
  }
});

function setupAtlas() {
  console.log('\n🌐 MongoDB Atlas Setup\n');
  console.log('1. Go to https://www.mongodb.com/atlas');
  console.log('2. Create a free account');
  console.log('3. Create a new cluster (free tier)');
  console.log('4. Get your connection string\n');
  
  rl.question('Enter your MongoDB Atlas connection string: ', (connectionString) => {
    if (connectionString.trim()) {
      updateConfig('atlas', connectionString.trim());
    } else {
      console.log('❌ No connection string provided. Setup cancelled.');
    }
    rl.close();
  });
}

function setupLocal() {
  console.log('\n💻 Local MongoDB Setup\n');
  console.log('1. Install MongoDB Community Server: https://docs.mongodb.com/manual/installation/');
  console.log('2. Start MongoDB service');
  console.log('3. The app will connect to mongodb://localhost:27017/nodejs_assessment\n');
  
  rl.question('Press Enter when MongoDB is installed and running: ', () => {
    updateConfig('local', 'mongodb://localhost:27017/nodejs_assessment');
    rl.close();
  });
}

function setupLimited() {
  console.log('\n⚠️  Limited Mode Setup\n');
  console.log('The server will start without database connection.');
  console.log('Only basic endpoints will be available.\n');
  
  rl.question('Press Enter to continue: ', () => {
    console.log('✅ Setup complete. Run "npm start" to start the server in limited mode.');
    rl.close();
  });
}

function updateConfig(type, connectionString) {
  const configPath = path.join(__dirname, 'config', 'database.js');
  
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    if (type === 'atlas') {
      configContent = configContent.replace(
        /atlas: process\.env\.MONGO_URI \|\| '.*?'/,
        `atlas: process.env.MONGO_URI || '${connectionString}'`
      );
      configContent = configContent.replace(
        /default: 'local'/,
        "default: 'atlas'"
      );
    } else if (type === 'local') {
      configContent = configContent.replace(
        /default: 'atlas'/,
        "default: 'local'"
      );
    }
    
    fs.writeFileSync(configPath, configContent);
    
    console.log('✅ Configuration updated successfully!');
    console.log(`📝 Database type set to: ${type}`);
    console.log('\n🚀 You can now run "npm start" to start the server.');
    
  } catch (error) {
    console.error('❌ Error updating configuration:', error.message);
  }
} 