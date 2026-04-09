const communityService = require('../services/communityService');
const logger = require('../utils/logger');

/**
 * Controller for Community interactions.
 * Replaces the old Group functionality.
 */
const createCommunity = async (req, res, next) => {
  try {
    const communityData = req.body;
    const community = await communityService.createCommunity(communityData);
    res.status(201).json({ data: community });
  } catch (err) {
    logger.error(`Error creating community: ${err.message}`);
    next(err);
  }
};

const joinCommunity = async (req, res, next) => {
  try {
    const { community_id } = req.body;
    const userId = req.user.id;

    await communityService.joinCommunity(community_id, userId);
    res.json({ data: { community_id, status: 'joined' } });
  } catch (err) {
    logger.error(`Error joining community: ${err.message}`);
    next(err);
  }
};

const listCommunities = async (req, res, next) => {
  try {
    const communities = await communityService.listCommunities();
    res.json({ data: communities });
  } catch (err) {
    logger.error(`Error listing communities: ${err.message}`);
    next(err);
  }
};

const getCommunityDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const community = await communityService.getCommunityDetails(id);
    if (!community) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Community not found' }
      });
    }
    res.json({ data: community });
  } catch (err) {
    logger.error(`Error getting community details: ${err.message}`);
    next(err);
  }
};

const getAggregatedPreferences = async (req, res, next) => {
  try {
    const { id } = req.params;
    const communityProfile = await communityService.aggregatePreferences(id);
    res.json({ data: communityProfile });
  } catch (err) {
    logger.error(`Error aggregating community preferences: ${err.message}`);
    next(err);
  }
};

module.exports = {
  createCommunity,
  joinCommunity,
  listCommunities,
  getCommunityDetails,
  getAggregatedPreferences
};
