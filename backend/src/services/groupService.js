const { query } = require('../config/database');

/**
 * Group service.
 * Manages group sessions and preference aggregation for collective adaptation.
 */
class GroupService {
  /**
   * Create a new group.
   * @param {string} userId - ID of the creator
   * @returns {Promise<object>} Created group
   */
  async createGroup(userId) {
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const result = await query(
      'INSERT INTO groups (invite_code, created_by) VALUES ($1, $2) RETURNING *',
      [inviteCode, userId]
    );
    const group = result.rows[0];
    
    // Auto-join creator
    await this.joinGroup(group.id, userId);
    
    return group;
  }

  /**
   * Join an existing group.
   * @param {string} groupId - Group UUID
   * @param {string} userId - User UUID
   */
  async joinGroup(groupId, userId) {
    await query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [groupId, userId]
    );
  }

  /**
   * Get group ID from invite code.
   * @param {string} inviteCode - 6-character code
   */
  async getGroupByCode(inviteCode) {
    const result = await query('SELECT id FROM groups WHERE invite_code = $1 AND status = \'active\'', [inviteCode]);
    return result.rows[0]?.id;
  }

  /**
   * Aggregate preferences of all group members into a single profile.
   * @param {string} groupId - Group UUID
   * @returns {Promise<object>} Synthetic group profile
   */
  async aggregatePreferences(groupId) {
    const members = await query(
      `SELECT u.preferences, u.accessibility_needs 
       FROM users u
       JOIN group_members gm ON u.id = gm.user_id
       WHERE gm.group_id = $1`,
      [groupId]
    );

    if (members.rows.length === 0) return {};

    const groupProfile = {
      preferred_categories: new Set(),
      preferred_tags: new Set(),
      accessibility_min: 0,
      walking_speed_kmh: 4.5,
      category_dwell_multipliers: {},
      is_group: true,
      member_count: members.rows.length
    };

    let totalWalkingSpeed = 0;
    const dwellCounts = {};

    members.rows.forEach(m => {
      const prefs = m.preferences || {};
      
      // Union of categories
      (prefs.preferred_categories || []).forEach(c => groupProfile.preferred_categories.add(c));
      (prefs.preferred_tags || []).forEach(t => groupProfile.preferred_tags.add(t));
      
      // Accessibility: Lowest common denominator (MAX level)
      groupProfile.accessibility_min = Math.max(groupProfile.accessibility_min, m.accessibility_needs || 0, prefs.accessibility_min || 0);
      
      // Walking Speed: Slowest member (MIN pace)
      const memberSpeed = prefs.walking_speed_kmh || 4.5;
      groupProfile.walking_speed_kmh = Math.min(groupProfile.walking_speed_kmh, memberSpeed);

      // Dwell Multipliers: Average across group
      const multipliers = prefs.category_dwell_multipliers || {};
      Object.entries(multipliers).forEach(([cat, val]) => {
        groupProfile.category_dwell_multipliers[cat] = (groupProfile.category_dwell_multipliers[cat] || 0) + val;
        dwellCounts[cat] = (dwellCounts[cat] || 0) + 1;
      });
    });

    // Finalize sets to arrays and calculate averages for multipliers
    groupProfile.preferred_categories = Array.from(groupProfile.preferred_categories);
    groupProfile.preferred_tags = Array.from(groupProfile.preferred_tags);
    
    Object.keys(groupProfile.category_dwell_multipliers).forEach(cat => {
      groupProfile.category_dwell_multipliers[cat] /= dwellCounts[cat];
    });

    return groupProfile;
  }
}

module.exports = new GroupService();
