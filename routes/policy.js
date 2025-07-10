const express = require('express');
const mongoose = require('mongoose');

// Only import models if database is connected
let Policy, User, Account, Agent, LOB, Carrier;
try {
  Policy = require('../models/Policy');
  User = require('../models/User');
  Account = require('../models/Account');
  Agent = require('../models/Agent');
  LOB = require('../models/LOB');
  Carrier = require('../models/Carrier');
} catch (error) {
  console.log('⚠️  Models not available - database not connected');
}

const router = express.Router();

// Search policies by username (firstName)
router.get('/search', async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({ error: 'Username parameter is required' });
    }

    // Find user by firstName
    const user = await User.findOne({ 
      firstName: { $regex: username, $options: 'i' } 
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find policies for the user with populated references
    const policies = await Policy.find({ userId: user._id })
      .populate('categoryId', 'categoryName')
      .populate('carrierId', 'companyName')
      .populate('accountId', 'accountName')
      .populate('userId', 'firstName lastName email');

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        email: user.email,
        phone: user.phone
      },
      policies: policies.map(policy => ({
        policyNumber: policy.policyNumber,
        startDate: policy.startDate,
        endDate: policy.endDate,
        category: policy.categoryId?.categoryName,
        carrier: policy.carrierId?.companyName,
        account: policy.accountId?.accountName
      }))
    });

  } catch (error) {
    console.error('Policy search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get aggregated policies by user
router.get('/aggregate', async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    const aggregation = await Policy.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'lobs',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $lookup: {
          from: 'carriers',
          localField: 'carrierId',
          foreignField: '_id',
          as: 'carrier'
        }
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'accountId',
          foreignField: '_id',
          as: 'account'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $unwind: '$category'
      },
      {
        $unwind: '$carrier'
      },
      {
        $unwind: '$account'
      },
      {
        $group: {
          _id: '$userId',
          user: { $first: '$user' },
          policies: {
            $push: {
              policyNumber: '$policyNumber',
              startDate: '$startDate',
              endDate: '$endDate',
              category: '$category.categoryName',
              carrier: '$carrier.companyName',
              account: '$account.accountName'
            }
          },
          totalPolicies: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          userId: '$_id',
          firstName: '$user.firstName',
          email: '$user.email',
          totalPolicies: 1,
          policies: 1
        }
      },
      {
        $sort: { firstName: 1 }
      }
    ]);

    res.json({
      totalUsers: aggregation.length,
      totalPolicies: aggregation.reduce((sum, user) => sum + user.totalPolicies, 0),
      users: aggregation
    });

  } catch (error) {
    console.error('Policy aggregation error:', error);
    res.status(500).json({ error: 'Aggregation failed', details: error.message });
  }
});

// Get all policies with pagination
router.get('/', async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const policies = await Policy.find()
      .populate('categoryId', 'categoryName')
      .populate('carrierId', 'companyName')
      .populate('accountId', 'accountName')
      .populate('userId', 'firstName email')
      .skip(skip)
      .limit(limit)
      .sort({ startDate: -1 });

    const total = await Policy.countDocuments();

    res.json({
      policies,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({ error: 'Failed to fetch policies', details: error.message });
  }
});

module.exports = router; 