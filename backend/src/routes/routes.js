const express = require('express');
const router = express.Router();
const { generateRoute, getRouteById } = require('../controllers/routeController');
const authenticate = require('../middleware/auth');

// POST /api/routes - Generate a new route
router.post('/', authenticate, generateRoute);

// GET /api/routes/:id - Get route by ID
router.get('/:id', authenticate, getRouteById);

module.exports = router;
