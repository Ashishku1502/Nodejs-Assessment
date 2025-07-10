const express = require('express');
const os = require('os');
const cron = require('node-cron');
const mongoose = require('mongoose');

// Only import Message model if database is connected
let Message;
try {
  Message = require('../models/Message');
} catch (error) {
  console.log('⚠️  Message model not available - database not connected');
}

const router = express.Router();

// CPU monitoring variables
let cpuUsageHistory = [];
let isRestartScheduled = false;

// Function to get CPU usage
const getCPUUsage = () => {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  const usage = 100 - (100 * idle / total);

  return Math.round(usage * 100) / 100;
};

// Monitor CPU usage every 5 seconds
setInterval(() => {
  const usage = getCPUUsage();
  const timestamp = new Date();
  
  cpuUsageHistory.push({ usage, timestamp });
  
  // Keep only last 100 readings
  if (cpuUsageHistory.length > 100) {
    cpuUsageHistory.shift();
  }

  // Auto-restart logic at 90% CPU usage
  if (usage > 90 && !isRestartScheduled) {
    console.log(`⚠️  High CPU usage detected: ${usage}%. Scheduling restart in 30 seconds...`);
    isRestartScheduled = true;
    
    setTimeout(() => {
      console.log('🔄 Restarting server due to high CPU usage...');
      process.exit(0); // PM2 or process manager will restart the app
    }, 30000);
  }
}, 5000);

// Get current CPU usage
router.get('/cpu', (req, res) => {
  try {
    const currentUsage = getCPUUsage();
    const avgUsage = cpuUsageHistory.length > 0 
      ? cpuUsageHistory.reduce((sum, reading) => sum + reading.usage, 0) / cpuUsageHistory.length
      : 0;

    res.json({
      current: currentUsage,
      average: Math.round(avgUsage * 100) / 100,
      history: cpuUsageHistory.slice(-20), // Last 20 readings
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      },
      restartScheduled: isRestartScheduled
    });
  } catch (error) {
    console.error('CPU monitoring error:', error);
    res.status(500).json({ error: 'Failed to get CPU usage', details: error.message });
  }
});

// Schedule a message
router.post('/schedule-message', async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    const { message, scheduledFor } = req.body;

    if (!message || !scheduledFor) {
      return res.status(400).json({ 
        error: 'Message and scheduledFor are required' 
      });
    }

    const scheduledDate = new Date(scheduledFor);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ 
        error: 'Invalid date format for scheduledFor' 
      });
    }

    if (scheduledDate <= new Date()) {
      return res.status(400).json({ 
        error: 'Scheduled time must be in the future' 
      });
    }

    const newMessage = new Message({
      message,
      scheduledFor: scheduledDate
    });

    await newMessage.save();

    // Schedule the message using node-cron
    const cronExpression = `${scheduledDate.getMinutes()} ${scheduledDate.getHours()} ${scheduledDate.getDate()} ${scheduledDate.getMonth() + 1} *`;
    
    cron.schedule(cronExpression, async () => {
      try {
        console.log(`📨 Sending scheduled message: ${message}`);
        
        // Here you would typically send the message via email, SMS, etc.
        // For now, we'll just log it and mark as sent
        await Message.findByIdAndUpdate(newMessage._id, { 
          sent: true, 
          sentAt: new Date() 
        });
        
        console.log('✅ Message sent successfully');
      } catch (error) {
        console.error('❌ Failed to send scheduled message:', error);
      }
    }, {
      scheduled: false
    });

    res.json({
      message: 'Message scheduled successfully',
      scheduledFor: scheduledDate,
      messageId: newMessage._id
    });

  } catch (error) {
    console.error('Schedule message error:', error);
    res.status(500).json({ 
      error: 'Failed to schedule message', 
      details: error.message 
    });
  }
});

// Get all scheduled messages
router.get('/scheduled-messages', async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    const messages = await Message.find()
      .sort({ scheduledFor: 1 });

    res.json({
      total: messages.length,
      messages: messages.map(msg => ({
        id: msg._id,
        message: msg.message,
        scheduledFor: msg.scheduledFor,
        sent: msg.sent,
        sentAt: msg.sentAt,
        createdAt: msg.createdAt
      }))
    });

  } catch (error) {
    console.error('Get scheduled messages error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch scheduled messages', 
      details: error.message 
    });
  }
});

// Cancel a scheduled message
router.delete('/scheduled-messages/:messageId', async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sent) {
      return res.status(400).json({ error: 'Cannot cancel already sent message' });
    }

    await Message.findByIdAndDelete(messageId);

    res.json({ message: 'Scheduled message cancelled successfully' });

  } catch (error) {
    console.error('Cancel message error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel message', 
      details: error.message 
    });
  }
});

module.exports = router; 