const express = require('express');
const router = express.Router();
const communityController = require('../controllers/communityController');
const authenticate = require('../middleware/auth');

/**
 * Routes for Community-based travel sessions.
 * Replaces the old Group endpoints.
 */

// GET /api/communities - List all available communities
router.get('/', authenticate, communityController.listCommunities);

// GET /api/communities/:id - Get specific community details (with channels)
router.get('/:id', authenticate, communityController.getCommunityDetails);

// POST /api/communities - Create a new community
router.post('/', authenticate, communityController.createCommunity);

// POST /api/communities/join - Join a community
router.post('/join', authenticate, communityController.joinCommunity);

// GET /api/communities/:id/preferences - Get aggregated member preferences
router.get('/:id/preferences', authenticate, communityController.getAggregatedPreferences);

module.exports = router;
