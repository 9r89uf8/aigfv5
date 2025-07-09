/**
 * Simple Authentication routes
 * Basic user authentication with Firebase
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getFirebaseFirestore } from '../config/firebase.js';
import logger from '../utils/logger.js';

const router = Router();
const db = getFirebaseFirestore();

/**
 * Register new user (Firebase handles this, but we create profile)
 * POST /api/auth/register
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { username, email } = req.body;
    
    // Check if user already exists
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (userDoc.exists) {
      return res.status(400).json({
        success: false,
        error: 'User already exists'
      });
    }
    
    // Create user profile
    const newUser = {
      uid: userId,
      username: username || email.split('@')[0],
      email,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastLoginAt: Date.now()
    };
    
    await userRef.set(newUser);
    
    res.status(201).json({
      success: true,
      user: newUser
    });
  } catch (error) {
    logger.error('Error registering user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user'
    });
  }
});

/**
 * Login user (Firebase handles auth, we update profile)
 * POST /api/auth/login
 */
router.post('/login', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    // Update last login
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      lastLoginAt: Date.now(),
      updatedAt: Date.now()
    });
    
    const userDoc = await userRef.get();
    const userData = userDoc.exists ? userDoc.data() : null;
    
    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    logger.error('Error logging in user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to login user'
    });
  }
});

/**
 * Get current user profile
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      user: userDoc.data()
    });
  } catch (error) {
    logger.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

/**
 * Update user profile
 * PUT /api/auth/me
 */
router.put('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { username } = req.body;
    
    const updates = {
      updatedAt: Date.now()
    };
    
    if (username) {
      updates.username = username;
    }
    
    const userRef = db.collection('users').doc(userId);
    await userRef.update(updates);
    
    const userDoc = await userRef.get();
    
    res.json({
      success: true,
      user: userDoc.data()
    });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

export default router;