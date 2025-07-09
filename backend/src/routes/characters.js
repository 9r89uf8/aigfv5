/**
 * Simple Character Routes
 * Basic character management endpoints
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getAllCharacters, getCharacterById, createCharacter, updateCharacter, deleteCharacter } from '../services/characterService.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Get all characters
 * GET /api/characters
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const characters = await getAllCharacters(parseInt(limit));
    
    res.json({
      success: true,
      characters
    });
  } catch (error) {
    logger.error('Error getting characters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get characters'
    });
  }
});

/**
 * Get character by ID
 * GET /api/characters/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const character = await getCharacterById(id);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }
    
    res.json({
      success: true,
      character
    });
  } catch (error) {
    logger.error('Error getting character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get character'
    });
  }
});

/**
 * Create new character (admin only)
 * POST /api/characters
 */
router.post('/', authenticate, async (req, res) => {
  try {
    // Basic admin check (you can implement proper admin middleware later)
    if (!req.user.email || !req.user.email.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const character = await createCharacter(req.body);
    
    res.status(201).json({
      success: true,
      character
    });
  } catch (error) {
    logger.error('Error creating character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create character'
    });
  }
});

/**
 * Update character (admin only)
 * PUT /api/characters/:id
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    // Basic admin check
    if (!req.user.email || !req.user.email.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const { id } = req.params;
    
    const character = await updateCharacter(id, req.body);
    
    if (!character) {
      return res.status(404).json({
        success: false,
        error: 'Character not found'
      });
    }
    
    res.json({
      success: true,
      character
    });
  } catch (error) {
    logger.error('Error updating character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update character'
    });
  }
});

/**
 * Delete character (admin only)
 * DELETE /api/characters/:id
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    // Basic admin check
    if (!req.user.email || !req.user.email.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    
    const { id } = req.params;
    
    await deleteCharacter(id);
    
    res.json({
      success: true,
      message: 'Character deleted'
    });
  } catch (error) {
    logger.error('Error deleting character:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete character'
    });
  }
});

export default router;