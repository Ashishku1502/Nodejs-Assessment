const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const { parse } = require('csv-parse');

// Import models
const Agent = require('../models/Agent');
const User = require('../models/User');
const Account = require('../models/Account');
const LOB = require('../models/LOB');
const Carrier = require('../models/Carrier');
const Policy = require('../models/Policy');

// Database configuration
const config = {
  local: 'mongodb://localhost:27017/nodejs_assessment',
  atlas: 'mongodb+srv://username:password@cluster.mongodb.net/nodejs_assessment?retryWrites=true&w=majority',
  default: 'local'
};

const connectDB = async () => {
  try {
    const uri = config[config.default];
    await mongoose.connect(uri);
    console.log('Worker: MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('Worker: MongoDB connection error:', error.message);
    return false;
  }
};

const processData = async () => {
  try {
    const { filePath, fileType } = workerData;
    
    // Connect to database
    const dbConnected = await connectDB();
    if (!dbConnected) {
      throw new Error('Failed to connect to database');
    }

    let data = [];
    
    // Read file based on type
    if (fileType === '.csv') {
      data = await readCSVFile(filePath);
    } else if (fileType === '.xlsx' || fileType === '.xls') {
      data = await readExcelFile(filePath);
    } else {
      throw new Error('Unsupported file type');
    }

    if (data.length === 0) {
      throw new Error('No data found in file');
    }

    // Process and insert data
    const result = await processAndInsertData(data);
    
    // Disconnect from database
    await mongoose.disconnect();
    
    // Send result back to main thread
    parentPort.postMessage(result);
    
  } catch (error) {
    console.error('Worker error:', error);
    parentPort.postMessage({ 
      error: error.message,
      recordsProcessed: 0,
      summary: {}
    });
  }
};

const readCSVFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const data = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        data.push(row);
      })
      .on('end', () => {
        resolve(data);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

const readExcelFile = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    return data;
  } catch (error) {
    throw new Error(`Failed to read Excel file: ${error.message}`);
  }
};

const processAndInsertData = async (data) => {
  const summary = {
    agents: 0,
    users: 0,
    accounts: 0,
    lobs: 0,
    carriers: 0,
    policies: 0,
    errors: 0
  };

  const recordsProcessed = data.length;
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    try {
      const row = data[i];
      
      // Process Agent
      if (row.Agent && row.Agent.trim()) {
        const agent = await Agent.findOneAndUpdate(
          { agentName: row.Agent.trim() },
          { agentName: row.Agent.trim() },
          { upsert: true, new: true }
        );
        summary.agents++;
      }

      // Process User
      if (row['First Name'] && row['Email']) {
        const userData = {
          firstName: row['First Name'].trim(),
          dob: parseDate(row['DOB']),
          address: row['Address'] || '',
          phone: row['Phone'] || '',
          state: row['State'] || '',
          zip: row['Zip'] || '',
          email: row['Email'].trim(),
          gender: row['Gender'] || '',
          userType: row['User Type'] || 'Customer'
        };

        const user = await User.findOneAndUpdate(
          { email: userData.email },
          userData,
          { upsert: true, new: true }
        );
        summary.users++;
      }

      // Process Account
      if (row['Account Name']) {
        const account = await Account.findOneAndUpdate(
          { accountName: row['Account Name'].trim() },
          { accountName: row['Account Name'].trim() },
          { upsert: true, new: true }
        );
        summary.accounts++;
      }

      // Process LOB (Line of Business)
      if (row['Category']) {
        const lob = await LOB.findOneAndUpdate(
          { categoryName: row['Category'].trim() },
          { categoryName: row['Category'].trim() },
          { upsert: true, new: true }
        );
        summary.lobs++;
      }

      // Process Carrier
      if (row['Carrier']) {
        const carrier = await Carrier.findOneAndUpdate(
          { companyName: row['Carrier'].trim() },
          { companyName: row['Carrier'].trim() },
          { upsert: true, new: true }
        );
        summary.carriers++;
      }

      // Process Policy
      if (row['Policy Number'] && row['First Name'] && row['Email']) {
        // Find related documents
        const user = await User.findOne({ email: row['Email'].trim() });
        const account = row['Account Name'] ? await Account.findOne({ accountName: row['Account Name'].trim() }) : null;
        const category = row['Category'] ? await LOB.findOne({ categoryName: row['Category'].trim() }) : null;
        const carrier = row['Carrier'] ? await Carrier.findOne({ companyName: row['Carrier'].trim() }) : null;

        if (user) {
          const policyData = {
            policyNumber: row['Policy Number'].trim(),
            startDate: parseDate(row['Start Date']),
            endDate: parseDate(row['End Date']),
            categoryId: category?._id,
            carrierId: carrier?._id,
            userId: user._id,
            accountId: account?._id
          };

          await Policy.findOneAndUpdate(
            { policyNumber: policyData.policyNumber },
            policyData,
            { upsert: true, new: true }
          );
          summary.policies++;
        }
      }

    } catch (error) {
      summary.errors++;
      errors.push(`Row ${i + 1}: ${error.message}`);
    }
  }

  return {
    recordsProcessed,
    summary,
    errors: errors.length > 0 ? errors : undefined
  };
};

const parseDate = (dateString) => {
  if (!dateString) return null;
  
  // Try different date formats
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try parsing common formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
    /(\d{4})-(\d{1,2})-(\d{1,2})/,   // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/    // MM-DD-YYYY
  ];
  
  for (const format of formats) {
    const match = dateString.toString().match(format);
    if (match) {
      const [, month, day, year] = match;
      return new Date(year, month - 1, day);
    }
  }
  
  return null;
};

// Start processing
processData(); 