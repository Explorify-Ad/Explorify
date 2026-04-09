const expeditionService = require('../services/expeditionService');
const logger = require('../utils/logger');

/**
 * Controller for Expedition Templates and User Quests.
 */

// --- Expedition Templates ---

const listExpeditionTemplates = async (req, res, next) => {
  try {
    const { category } = req.query;
    const templates = await expeditionService.listTemplates({ category });
    res.json({ data: templates });
  } catch (err) {
    logger.error(`Error listing expedition templates: ${err.message}`);
    next(err);
  }
};

// --- User Quests (Instances of Expeditions) ---

const getUserQuests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    // Auto-assign any missing quests for this user
    const quests = await expeditionService.autoAssignQuests(userId);
    res.json({ data: quests });
  } catch (err) {
    logger.error(`Error fetching user quests: ${err.message}`);
    next(err);
  }
};

const claimQuestReward = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params; // quest_id
    const result = await expeditionService.claimQuestReward(userId, id);
    
    if (result.success) {
      res.json({ 
        message: 'Reward claimed successfully', 
        xp_awarded: result.xp_awarded 
      });
    } else {
      res.status(400).json({ 
        error: { code: 'CLAIM_FAILED', message: 'Could not claim reward. Quest may not be completed or already claimed.' } 
      });
    }
  } catch (err) {
    logger.error(`Error claiming quest reward: ${err.message}`);
    next(err);
  }
};

// --- Community Expeditions ---

const getCommunityExpeditionProgress = async (req, res, next) => {
  try {
    const { communityId, expeditionId } = req.params;
    const progress = await expeditionService.getCommunityExpedition(communityId, expeditionId);
    if (!progress) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Community expedition not found' }
      });
    }
    res.json({ data: progress });
  } catch (err) {
    logger.error(`Error fetching community expedition progress: ${err.message}`);
    next(err);
  }
};

module.exports = {
  listExpeditionTemplates,
  getUserQuests,
  claimQuestReward,
  getCommunityExpeditionProgress
};
