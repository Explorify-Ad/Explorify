const express = require('express');
const router = express.Router();
const questController = require('../controllers/questController');
const authenticate = require('../middleware/auth');

// All quest routes require authentication
router.use(authenticate);

// GET /api/quests - Get user's active/completed quests
router.get('/', questController.getUserQuests);

// GET /api/quests/communities - Get all available communities
router.get('/communities', questController.getCommunities);

// POST /api/quests/join-community - Join a community
router.post('/join-community', questController.joinCommunity);

module.exports = router;
