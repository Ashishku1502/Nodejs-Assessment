const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

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

// Mock data for testing
const mockUsers = [
  { id: 1, firstName: 'John', email: 'john@example.com', phone: '555-0101' },
  { id: 2, firstName: 'Jane', email: 'jane@example.com', phone: '555-0102' },
  { id: 3, firstName: 'Bob', email: 'bob@example.com', phone: '555-0103' }
];

const mockPolicies = [
  { 
    policyNumber: 'POL001', 
    startDate: '2024-01-01', 
    endDate: '2024-12-31',
    category: 'Auto',
    carrier: 'State Farm',
    account: 'Personal Account'
  },
  { 
    policyNumber: 'POL002', 
    startDate: '2024-02-01', 
    endDate: '2025-01-31',
    category: 'Home',
    carrier: 'Allstate',
    account: 'Family Account'
  }
];

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Node.js Assessment Test Server is running.',
    status: 'Test server is working (no database required)',
    database: 'Not connected (test mode)',
    endpoints: {
      test: '/test',
      mockUsers: '/mock/users',
      mockPolicies: '/mock/policies',
      cpu: '/system/cpu'
    }
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ 
    message: 'Test endpoint working!',
    timestamp: new Date().toISOString(),
    environment: 'test'
  });
});

// Mock users endpoint
app.get('/mock/users', (req, res) => {
  const { search } = req.query;
  let users = mockUsers;
  
  if (search) {
    users = mockUsers.filter(user => 
      user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  res.json({ users, total: users.length });
});

// Mock policies endpoint
app.get('/mock/policies', (req, res) => {
  const { username } = req.query;
  
  if (username) {
    const user = mockUsers.find(u => 
      u.firstName.toLowerCase().includes(username.toLowerCase())
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        email: user.email,
        phone: user.phone
      },
      policies: mockPolicies
    });
  }
  
  res.json({ policies: mockPolicies, total: mockPolicies.length });
});

// Mock CPU monitoring
app.get('/system/cpu', (req, res) => {
  const mockCPUUsage = Math.random() * 100;
  
  res.json({
    current: Math.round(mockCPUUsage * 100) / 100,
    average: Math.round((mockCPUUsage * 0.8) * 100) / 100,
    history: Array.from({ length: 10 }, (_, i) => ({
      usage: Math.round((Math.random() * 100) * 100) / 100,
      timestamp: new Date(Date.now() - i * 5000).toISOString()
    })),
    systemInfo: {
      platform: 'test',
      arch: 'test',
      totalMemory: 8589934592, // 8GB
      freeMemory: 4294967296,  // 4GB
      uptime: 3600,
      loadAverage: [0.5, 0.3, 0.2]
    },
    restartScheduled: false
  });
});

// Mock file upload endpoint
app.post('/upload', (req, res) => {
  res.json({
    message: 'Mock file upload successful (test mode)',
    recordsProcessed: 150,
    summary: {
      agents: 25,
      users: 50,
      accounts: 30,
      lobs: 5,
      carriers: 10,
      policies: 100,
      errors: 0
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
      'GET /test',
      'GET /mock/users',
      'GET /mock/policies',
      'GET /system/cpu',
      'POST /upload'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🧪 Test server running on http://localhost:${PORT}`);
  console.log('✅ Test server is working (no database required)!');
  console.log('\n📋 Available test endpoints:');
  console.log('  GET  / - Health check');
  console.log('  GET  /test - Test endpoint');
  console.log('  GET  /mock/users - Mock users data');
  console.log('  GET  /mock/policies - Mock policies data');
  console.log('  GET  /system/cpu - Mock CPU monitoring');
  console.log('  POST /upload - Mock file upload');
  console.log('\n💡 This server runs without MongoDB for testing purposes');
}); 