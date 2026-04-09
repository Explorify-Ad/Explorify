const express = require('express');
const router = express.Router();
const { generateRoute, getRouteById, trackWalkingPace, markRouteAbandoned } = require('../controllers/routeController');
const authenticate = require('../middleware/auth');

// POST /api/routes - Generate a new route
router.post('/', authenticate, generateRoute);

// POST /api/routes/generate - Alias used by mobile client
router.post('/generate', authenticate, generateRoute);

// GET /api/routes/:id - Get route by ID
router.get('/:id', authenticate, getRouteById);

// POST /api/routes/track-walking - Update user's learned pace
router.post('/track-walking', authenticate, trackWalkingPace);

// DELETE /api/routes/:id/abandon - Mark route as abandoned
router.delete('/:id/abandon', authenticate, markRouteAbandoned);

module.exports = router;
