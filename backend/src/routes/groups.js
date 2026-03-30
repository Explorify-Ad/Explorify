const express = require('express');
const router = express.Router();
const { createGroup, joinGroup, getAggregatedPreferences } = require('../controllers/groupController');
const authenticate = require('../middleware/auth');

// POST /api/groups - Create a new group session
router.post('/', authenticate, createGroup);

// POST /api/groups/join - Join a group session via invite code
router.post('/join', authenticate, joinGroup);

// GET /api/groups/:id/preferences - Get merged group preferences
router.get('/:id/preferences', authenticate, getAggregatedPreferences);

module.exports = router;
