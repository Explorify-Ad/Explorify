const groupService = require('../services/groupService');
const logger = require('../utils/logger');

/**
 * Controller for group-based travel sessions.
 */
const createGroup = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const group = await groupService.createGroup(userId);
    res.status(201).json({ data: group });
  } catch (err) {
    logger.error(`Error creating group: ${err.message}`);
    next(err);
  }
};

const joinGroup = async (req, res, next) => {
  try {
    const { invite_code } = req.body;
    const userId = req.user.id;

    const groupId = await groupService.getGroupByCode(invite_code);

    if (!groupId) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Active group with this code not found',
        },
      });
    }

    await groupService.joinGroup(groupId, userId);
    res.json({ data: { group_id: groupId, status: 'joined' } });
  } catch (err) {
    logger.error(`Error joining group: ${err.message}`);
    next(err);
  }
};

const getAggregatedPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const groupProfile = await groupService.aggregatePreferences(id);
    res.json({ data: groupProfile });
  } catch (err) {
    logger.error(`Error aggregating group preferences: ${err.message}`);
    next(err);
  }
};

module.exports = { createGroup, joinGroup, getAggregatedPreferences };
