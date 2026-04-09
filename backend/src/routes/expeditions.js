const express = require('express');
const router = express.Router();
const expeditionController = require('../controllers/expeditionController');
const authenticate = require('../middleware/auth');

/**
 * Routes for Expedition Templates (Discovery Tasks) and Community milestones.
 */

// GET /api/expeditions - List all available expedition templates
router.get('/', authenticate, expeditionController.listExpeditionTemplates);

// GET /api/expeditions/:communityId/:expeditionId - Fetch community progress for an expedition
router.get('/:communityId/:expeditionId', authenticate, expeditionController.getCommunityExpeditionProgress);

module.exports = router;
