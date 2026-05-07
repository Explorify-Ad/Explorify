const QuestService = require('../services/questService');
const { query } = require('../config/database');

/**
 * Controller for Quest and Gamification features.
 */
const getUserQuests = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const quests = await QuestService.getUserQuests(userId);
    res.json({ data: quests });
  } catch (err) {
    next(err);
  }
};

const joinCommunity = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const { communityId } = req.body;
    const membership = await QuestService.joinCommunity(userId, communityId);
    res.json({ data: membership });
  } catch (err) {
    next(err);
  }
};

const getCommunities = async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM communities');
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUserQuests, joinCommunity, getCommunities };
