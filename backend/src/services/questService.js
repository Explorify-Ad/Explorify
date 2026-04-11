const { query } = require('../config/database');

/**
 * QuestService - handles personal quests, community challenges, and hidden spot unlocks.
 */
class QuestService {
  /**
   * Update quest progress after a landmark check-in.
   */
  async handleCheckIn(userId, landmark) {
    // 1. Get active quests for this user
    const activeQuests = await query(
      `SELECT q.*, uq.collected_themes 
       FROM user_quests uq
       JOIN quests q ON uq.quest_id = q.id
       WHERE uq.user_id = $1 AND uq.status = 'active'`,
      [userId]
    );

    const outcomes = [];

    for (const quest of activeQuests.rows) {
      let collectedThemes = quest.collected_themes || [];
      const theme = landmark.category; // Using category as theme

      // If this theme is required and not yet collected
      if (quest.required_themes && quest.required_themes.includes(theme) && !collectedThemes.includes(theme)) {
        collectedThemes.push(theme);
        
        const isComplete = collectedThemes.length >= quest.required_count;
        const status = isComplete ? 'completed' : 'active';

        await query(
          `UPDATE user_quests 
           SET collected_themes = $1, 
               progress_count = $2,
               status = $3,
               unlocked_at = $4
           WHERE user_id = $5 AND quest_id = $6`,
          [
            JSON.stringify(collectedThemes), 
            collectedThemes.length, 
            status, 
            isComplete ? new Date() : null,
            userId, 
            quest.id
          ]
        );

        if (isComplete) {
          outcomes.push({
            quest_id: quest.id,
            type: 'QUEST_COMPLETED',
            title: quest.title,
            reward_landmark_id: quest.reward_landmark_id
          });
          
          // Award Badge
          await this.awardBadge(userId, 'THEME_MASTER', { quest_id: quest.id });
        }
      }
    }

    // 2. Update community challenges
    await this.updateCommunityChallenges(userId, landmark);

    return outcomes;
  }

  /**
   * Update community challenge progress.
   */
  async updateCommunityChallenges(userId, landmark) {
    // Find challenges for communities this user belongs to
    const challenges = await query(
      `SELECT cc.* 
       FROM community_challenges cc
       JOIN community_members cm ON cc.community_id = cm.community_id
       WHERE cm.user_id = $1 AND cc.is_active = true`,
      [userId]
    );

    for (const challenge of challenges.rows) {
      // Increment community progress
      await query(
        `UPDATE community_challenges 
         SET current_count = current_count + 1
         WHERE id = $1`,
        [challenge.id]
      );
    }
  }

  /**
   * Award a badge to a user.
   */
  async awardBadge(userId, type, metadata = {}) {
    return query(
      `INSERT INTO user_badges (user_id, badge_type, metadata)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, type, JSON.stringify(metadata)]
    );
  }

  /**
   * Get user's current quests and progress.
   */
  async getUserQuests(userId) {
    const result = await query(
      `SELECT q.*, uq.status, uq.progress_count, uq.collected_themes
       FROM user_quests uq
       JOIN quests q ON uq.quest_id = q.id
       WHERE uq.user_id = $1`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Join a community.
   */
  async joinCommunity(userId, communityId) {
    return query(
      `INSERT INTO community_members (user_id, community_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *`,
      [userId, communityId]
    );
  }
}

module.exports = new QuestService();
