const express = require('express');
const multer = require('multer');
const { Worker } = require('worker_threads');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// File upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Database not connected', 
      message: 'This feature requires a database connection. Please set up MongoDB first.' 
    });
  }

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileType = path.extname(req.file.originalname).toLowerCase();

    // Create worker thread for processing
    const worker = new Worker(path.join(__dirname, '../worker/dataProcessor.js'), {
      workerData: {
        filePath,
        fileType
      }
    });

    let result = null;
    let error = null;

    worker.on('message', (data) => {
      result = data;
    });

    worker.on('error', (err) => {
      error = err;
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        error = new Error(`Worker stopped with exit code ${code}`);
      }
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }

      if (error) {
        return res.status(500).json({ 
          error: 'File processing failed', 
          details: error.message 
        });
      }

      res.json({
        message: 'File uploaded and processed successfully',
        recordsProcessed: result.recordsProcessed,
        summary: result.summary
      });
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

module.exports = router; 