/**
 * Simple Conversation Routes
 * Basic REST API endpoints for conversation management
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getOrCreateConversation, getUserConversations, getMessages, deleteConversation } from '../services/firebaseService.js';
import { getCharacterById } from '../services/characterService.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Get user conversations
 * GET /api/conversations
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const conversations = await getUserConversations(req.user.uid, parseInt(limit));
    
    res.json({
      success: true,
      conversations
    });
  } catch (error) {
    logger.error('Error getting conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations'
    });
  }
});

/**
 * Get or create conversation
 * POST /api/conversations
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { characterId } = req.body;
    
    if (!characterId) {
      return res.status(400).json({
        success: false,
        error: 'Character ID required'
      });
    }
    
    // Verify character exists
    const character = await getCharacterById(characterId);
    if (!character) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }
    
    const conversation = await getOrCreateConversation(req.user.uid, characterId);
    
    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation'
    });
  }
});

/**
 * Get conversation messages
 * GET /api/conversations/:conversationId/messages
 */
router.get('/:conversationId/messages', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;
    
    // Verify user owns this conversation
    const [userId] = conversationId.split('_');
    if (userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to conversation'
      });
    }
    
    const messages = await getMessages(conversationId, parseInt(limit));
    
    res.json({
      success: true,
      messages
    });
  } catch (error) {
    logger.error('Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get messages'
    });
  }
});

/**
 * Delete conversation
 * DELETE /api/conversations/:conversationId
 */
router.delete('/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Verify user owns this conversation
    const [userId] = conversationId.split('_');
    if (userId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to conversation'
      });
    }
    
    await deleteConversation(conversationId);
    
    res.json({
      success: true,
      message: 'Conversation deleted'
    });
  } catch (error) {
    logger.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation'
    });
  }
});

export default router;