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
      `SELECT q.*, e.title, e.description, e.category, e.difficulty, e.reward_xp, e.required_count, e.is_narrative
       FROM quests q
       JOIN expeditions e ON q.expedition_id = e.id
       WHERE q.user_id = $1`,
      [userId]
    );

    // Fetch landmarks for narrative quests
    for (const q of result.rows) {
      if (q.is_narrative) {
        const landmarks = await query(
          `SELECT l.*, el.step_number, el.story_fragment 
           FROM expedition_landmarks el
           JOIN landmarks l ON el.landmark_id = l.id
           WHERE el.expedition_id = $1
           ORDER BY el.step_number ASC`,
          [q.expedition_id]
        );
        q.landmarks = landmarks.rows;
      }
    }

    return result.rows;
  }

  /**
   * Handle landmark discovery for quests and community expeditions.
   */
  async handleDiscovery(userId, landmark) {
    const category = landmark.category;
    const landmarkId = landmark.id;
    
    // 1. Update personal quests (Explorer type - category match)
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
         AND e.is_narrative = false
       RETURNING q.*, e.title`,
      [userId, category]
    );

    // 2. Update personal quests (Narrative type - sequential match)
    const narrativeResult = await query(
      `UPDATE quests q
       SET progress_count = progress_count + 1,
           status = CASE WHEN progress_count + 1 >= e.required_count THEN 'completed' ELSE 'active' END,
           completed_at = CASE WHEN progress_count + 1 >= e.required_count THEN NOW() ELSE NULL END
       FROM expeditions e
       JOIN expedition_landmarks el ON e.id = el.expedition_id
       WHERE q.expedition_id = e.id
         AND q.user_id = $1
         AND q.status = 'active'
         AND e.is_narrative = true
         AND el.landmark_id = $2
         AND el.step_number = q.progress_count + 1
       RETURNING q.*, e.title`,
      [userId, landmarkId]
    );

    // 3. Update community expeditions for communities the user belongs to
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
      personalUpdates: [...personalResult.rows, ...narrativeResult.rows],
      communityUpdates: communityResult.rows
    };
  }

  /**
   * Aggregate preferences for all members of an expedition (Phase 8.6)
   */
  async aggregateExpeditionPreferences(expeditionId) {
    const result = await query(
      `SELECT u.preferences, u.interests, u.accessibility_needs
       FROM expedition_members em
       JOIN users u ON u.id = em.user_id
       WHERE em.expedition_id = $1`,
      [expeditionId]
    );

    if (result.rows.length === 0) return {};

    const categoryVotes = {};
    let maxAccess = 0;
    const allInterests = new Set();
    
    result.rows.forEach(row => {
      const prefs = row.preferences || {};
      const interests = row.interests || [];
      
      interests.forEach(i => {
        categoryVotes[i] = (categoryVotes[i] || 0) + 1;
        allInterests.add(i);
      });

      if (row.accessibility_needs > maxAccess) {
        maxAccess = row.accessibility_needs;
      }
    });

    const memberCount = result.rows.length;
    const consolidatedInterests = Array.from(allInterests).filter(i => (categoryVotes[i] || 0) / memberCount >= 0.5);

    return {
      interests: consolidatedInterests.length > 0 ? consolidatedInterests : Array.from(allInterests),
      accessibility_min: maxAccess,
      high_accessibility_needed: maxAccess >= 4,
      is_expedition: true,
      member_count: memberCount
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
