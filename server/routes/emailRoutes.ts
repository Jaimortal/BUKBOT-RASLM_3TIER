import express from 'express';
import { sendVerificationCode, verifyCode } from '../services/emailService.js';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Send verification code
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    // Basic email validation
    if (!email.includes('@') || !email.includes('.')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }
    
    const result = await sendVerificationCode(email);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
    
  } catch (error) {
    console.error('Error in send-verification endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Verify current email OTP code (Step 2 of Change Email)
router.post('/verify-code', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required',
      });
    }

    const verificationResult = verifyCode(email, verificationCode);
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    return res.json({
      success: true,
      message: 'Verification code confirmed.',
    });
  } catch (error) {
    console.error('Error in verify-code endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify code',
    });
  }
});

// Verify code and update email
router.post('/verify-and-update', async (req, res) => {
  try {
    const { newEmail, verificationCode, currentEmail, password } = req.body;
    
    if (!newEmail || !verificationCode || !currentEmail || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Verify the code sent to the new email first
    const verificationResult = verifyCode(newEmail, verificationCode);
    
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }
    
    // Update email in admin-users.json
    const adminUsersPath = path.join(process.cwd(), 'server', 'account', 'admin-users.json');
    const adminData = JSON.parse(fs.readFileSync(adminUsersPath, 'utf8'));
    
    let userUpdated = false;
    const environment = process.env.NODE_ENV || 'development';
    const normalizedCurrent = currentEmail.trim().toLowerCase();
    const normalizedNew = newEmail.trim().toLowerCase();
    
    if (adminData[environment] && adminData[environment].users) {
      const userIndex = adminData[environment].users.findIndex(
        (user: any) => String(user.email || '').toLowerCase() === normalizedCurrent
      );
      
      if (userIndex !== -1) {
        adminData[environment].users[userIndex].email = normalizedNew;
        userUpdated = true;
      }
    }

    // Also update in admin-rbac.json if present
    const rbacPath = path.join(process.cwd(), 'server', 'account', 'admin-rbac.json');
    if (fs.existsSync(rbacPath)) {
      const rbacData = JSON.parse(fs.readFileSync(rbacPath, 'utf8'));
      if (Array.isArray(rbacData.users)) {
        const rbacIdx = rbacData.users.findIndex(
          (u: any) => String(u.email || '').toLowerCase() === normalizedCurrent
        );
        if (rbacIdx !== -1) {
          rbacData.users[rbacIdx].email = normalizedNew;
          rbacData.users[rbacIdx].updatedAt = new Date().toISOString();
          fs.writeFileSync(rbacPath, JSON.stringify(rbacData, null, 2));
          userUpdated = true;
        }
      }
    }
    
    if (!userUpdated) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Save the updated admin-users.json data
    fs.writeFileSync(adminUsersPath, JSON.stringify(adminData, null, 2));
    
    res.json({ 
      success: true, 
      message: 'Email updated successfully' 
    });
    
  } catch (error) {
    console.error('Error in verify-and-update endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update email' 
    });
  }
});

export default router;
