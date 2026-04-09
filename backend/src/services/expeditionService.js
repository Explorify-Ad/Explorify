const { query } = require('../config/database');


/**
 * Expedition Service.
 * Manages Expedition Templates (Discovery tasks) and Quests (User Progress instances).
 */
class ExpeditionService {
  /**
   * List available expedition templates.
   */
  async listTemplates(filters = {}) {
    let sql = 'SELECT * FROM expeditions';
    const params = [];
    
    if (filters.category) {
      sql += ' WHERE category = $1';
      params.push(filters.category);
    }
    
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Get total community progress for an expedition.
   */
  async getCommunityExpedition(communityId, expeditionId) {
    const result = await query(
      `SELECT ce.*, e.title, e.reward_xp 
       FROM community_expeditions ce
       JOIN expeditions e ON ce.expedition_id = e.id
       WHERE ce.community_id = $1 AND ce.expedition_id = $2`,
      [communityId, expeditionId]
    );
    return result.rows[0];
  }

  /**
   * Auto-assign quests to a user based on community/personal logic.
   * This is called on login or refresh.
   */
  async autoAssignQuests(userId) {
    // 1. Get all expedition templates
    const templates = await query('SELECT id FROM expeditions');
    
    for (const template of templates.rows) {
      // 2. Insert into quests (instances) if not already active
      await query(
        `INSERT INTO quests (user_id, expedition_id, status) 
         VALUES ($1, $2, 'active') 
         ON CONFLICT (user_id, expedition_id) DO NOTHING`,
        [userId, template.id]
      );
    }
    
    return this.getUserQuests(userId);
  }

  /**
   * Get user's active quests.
   */
  async getUserQuests(userId) {
    const result = await query(
      `SELECT q.*, e.title, e.description, e.category, e.difficulty, e.reward_xp, e.required_count
       FROM quests q
       JOIN expeditions e ON q.expedition_id = e.id
       WHERE q.user_id = $1`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Handle landmark discovery for quests and community expeditions.
   */
  async handleDiscovery(userId, landmark) {
    const category = landmark.category;
    
    // 1. Update personal quests
    const personalResult = await query(
      `UPDATE quests q
       SET progress_count = progress_count + 1,
           status = CASE WHEN progress_count + 1 >= e.required_count THEN 'completed' ELSE 'active' END,
           completed_at = CASE WHEN progress_count + 1 >= e.required_count THEN NOW() ELSE NULL END
       FROM expeditions e
       WHERE q.expedition_id = e.id 
         AND q.user_id = $1 
         AND q.status = 'active'
         AND e.category = $2
       RETURNING q.*, e.title`,
      [userId, category]
    );

    // 2. Update community expeditions for communities the user belongs to
    const communityResult = await query(
      `UPDATE community_expeditions ce
       SET current_count = current_count + 1
       FROM community_members cm
       JOIN expeditions e ON ce.expedition_id = e.id
       WHERE ce.community_id = cm.community_id 
         AND cm.user_id = $1
         AND ce.is_active = true
         AND e.category = $2
       RETURNING ce.*, e.title`,
      [userId, category]
    );

    return {
      personalUpdates: personalResult.rows,
      communityUpdates: communityResult.rows
    };
  }

  /**
   * Claim reward for a completed quest.
   */
  async claimQuestReward(userId, questId) {
    const result = await query(
      `UPDATE quests 
       SET status = 'claimed' 
       WHERE id = $1 AND user_id = $2 AND status = 'completed'
       RETURNING *`,
      [questId, userId]
    );
    
    if (result.rows.length > 0) {
      // Logic for awarding XP points to user profile would go here
      const quest = result.rows[0];
      const template = await query('SELECT reward_xp FROM expeditions WHERE id = $1', [quest.expedition_id]);
      const xp = template.rows[0]?.reward_xp || 0;
      
      await query('UPDATE users SET total_points = total_points + $1 WHERE id = $2', [xp, userId]);
      
      return { success: true, xp_awarded: xp };
    }
    
    return { success: false };
  }
}

module.exports = new ExpeditionService();
