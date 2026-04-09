const express = require('express');
const router = express.Router();
const expeditionController = require('../controllers/expeditionController');
const authenticate = require('../middleware/auth');

/**
 * Routes for Active User Quest instances (Formerly UserQuests).
 * These are personal instances of Expedition templates.
 */

// GET /api/quests - List active quests for current user (Auto-assigned)
router.get('/', authenticate, expeditionController.getUserQuests);

// POST /api/quests/:id/claim - Claim reward for a completed quest
router.post('/:id/claim', authenticate, expeditionController.claimQuestReward);

module.exports = router;
