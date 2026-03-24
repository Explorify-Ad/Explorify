const express = require('express');
const router = express.Router();
const { getAllLandmarks, getLandmarkById } = require('../controllers/landmarkController');
const { getRecommendations } = require('../controllers/recommendationController');

// GET /api/landmarks/recommendations - Get personalized recommendations
router.get('/recommendations', getRecommendations);

// GET /api/landmarks - Get all landmarks
router.get('/', getAllLandmarks);

// GET /api/landmarks/:id - Get landmark by ID
router.get('/:id', getLandmarkById);

module.exports = router;
