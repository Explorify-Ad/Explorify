const express = require('express');
const router = express.Router();
const { getAllLandmarks, getLandmarkById } = require('../controllers/landmarkController');
const { getRecommendations } = require('../controllers/recommendationController');
const authenticate = require('../middleware/auth');

// GET /api/landmarks/recommendations - Get personalized recommendations
router.get('/recommendations', authenticate, getRecommendations);

// GET /api/landmarks/context - Get current weather and time context
router.get('/context', authenticate, async (req, res, next) => {
  try {
    const weatherService = require('../services/weatherService');
    const lat = req.query.lat || 53.3498;
    const lng = req.query.lng || -6.2603;
    const weather = await weatherService.getCurrentWeather(lat, lng);
    const hour = new Date().getHours();
    
    let timeSlot = 'Day';
    if (hour >= 6 && hour < 11) timeSlot = 'Morning';
    else if (hour >= 11 && hour < 17) timeSlot = 'Midday';
    else if (hour >= 17 && hour < 22) timeSlot = 'Evening';
    else timeSlot = 'Night';

    res.json({ data: { weather, timeSlot, hour } });
  } catch (err) {
    next(err);
  }
});

// GET /api/landmarks - Get all landmarks
router.get('/', getAllLandmarks);

// GET /api/landmarks/:id - Get landmark by ID
router.get('/:id', getLandmarkById);

// POST /api/landmarks/describe - Get personalized AI description
router.post('/describe', authenticate, async (req, res, next) => {
  try {
    const { query } = require('../config/database');
    const llmService = require('../services/llmService');
    const { landmark_id, user_profile } = req.body;

    const result = await query('SELECT * FROM landmarks WHERE id = $1', [landmark_id]);
    const landmark = result.rows[0];
    if (!landmark) return res.status(404).json({ error: 'Landmark not found' });

    const response = await llmService.getPersonalisedDescription(landmark, user_profile);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
