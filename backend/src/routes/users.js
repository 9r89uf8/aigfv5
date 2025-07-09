/**
 * Simple User routes
 * Basic user operations
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getFirebaseFirestore } from '../config/firebase.js';
import logger from '../utils/logger.js';

const router = Router();
const db = getFirebaseFirestore();

/**
 * Get user by ID
 * GET /api/users/:uid
 */
router.get('/:uid', authenticate, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // Basic admin check or own profile check
    if (req.user.uid !== uid && (!req.user.email || !req.user.email.includes('admin'))) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const userRef = db.collection('users').doc(uid);
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
    logger.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

/**
 * Get user by username
 * GET /api/users/username/:username
 */
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const usersRef = db.collection('users');
    const query = usersRef.where('username', '==', username).limit(1);
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    
    // Return limited info for public access
    res.json({
      success: true,
      user: {
        uid: user.uid,
        username: user.username,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    logger.error('Error getting user by username:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

export default router;