const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { authenticate } = require('../utils/auth');
const { processAirdrop, validateRecipients } = require('../services/airdropService');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Endpoint for JSON payload airdrop
router.post('/airdrop', authenticate, async (req, res) => {
  try {
    const { recipients } = req.body;
    
    if (!recipients) {
      return res.status(400).json({ error: 'Recipients are required' });
    }
    
    const { validatedRecipients, errors } = validateRecipients(recipients);
    
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }
    
    const result = await processAirdrop(validatedRecipients);
    res.json(result);
  } catch (error) {
    console.error('Error in airdrop endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint for CSV file upload airdrop
router.post('/airdrop/csv', authenticate, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const recipients = [];
  
  try {
    // Parse CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        if (data.address && data.amount) {
          recipients.push({
            address: data.address.trim(),
            amount: parseFloat(data.amount)
          });
        }
      })
      .on('end', async () => {
        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        
        if (recipients.length === 0) {
          return res.status(400).json({ error: 'No valid recipients found in CSV' });
        }
        
        const { validatedRecipients, errors } = validateRecipients(recipients);
        
        if (errors.length > 0) {
          return res.status(400).json({ errors });
        }
        
        const result = await processAirdrop(validatedRecipients);
        res.json(result);
      })
      .on('error', (error) => {
        console.error('Error parsing CSV:', error);
        res.status(500).json({ error: 'Error parsing CSV file' });
      });
  } catch (error) {
    console.error('Error in CSV airdrop endpoint:', error);
    res.status(500).json({ error: error.message });
    
    // Clean up the file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
  }
});

module.exports = router;
