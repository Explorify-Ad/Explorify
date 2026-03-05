const express = require('express');
const router = express.Router();
const { getAllLandmarks, getLandmarkById } = require('../controllers/landmarkController');

// GET /api/landmarks - Get all landmarks
router.get('/', getAllLandmarks);

// GET /api/landmarks/:id - Get landmark by ID
router.get('/:id', getLandmarkById);

module.exports = router;
