const express = require('express');
const router = express.Router();
const llmService = require('../services/llmService');
const driftDetectionService = require('../services/driftDetectionService');

router.post('/drift-check', async (req, res) => {
  try {
    const { user_id } = req.body;
    const result = await driftDetectionService.detectDrift(user_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/daily-challenge', async (req, res) => {
  try {
    const { preferences, weather, timeOfDay } = req.body;
    const challenge = await llmService.getDailyChallenge(preferences, weather, timeOfDay);
    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/refinement', async (req, res) => {
  try {
    const { user_id, recentVisits } = req.body;
    const refinement = await llmService.getConversationalRefinement(user_id, recentVisits);
    res.json(refinement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
