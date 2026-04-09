const { query } = require('../config/database');


/**
 * Community Service.
 * Manages persistent social communities, multi-channel chat, and member preference aggregation.
 */
class CommunityService {
  /**
   * Create a new community.
   * @param {object} communityData - name, description, theme, avatar_url
   * @returns {Promise<object>} Created community
   */
  async createCommunity(communityData) {
    const { name, description, theme, avatar_url } = communityData;
    
    const result = await query(
      `INSERT INTO communities (name, description, theme, avatar_url) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, description, theme, avatar_url]
    );
    const community = result.rows[0];

    // Auto-create default channels
    await this.createDefaultChannels(community.id);

    return community;
  }

  /**
   * Create default channels for a community.
   */
  async createDefaultChannels(communityId) {
    const channels = [
      { name: 'General', slug: 'general' },
      { name: 'Meetups', slug: 'meetups' }
    ];

    for (const channel of channels) {
      await query(
        `INSERT INTO community_channels (community_id, name, slug) 
         VALUES ($1, $2, $3) ON CONFLICT (community_id, slug) DO NOTHING`,
        [communityId, channel.name, channel.slug]
      );
    }
  }

  /**
   * Join a community.
   */
  async joinCommunity(communityId, userId) {
    // Failsafe: Ensure user exists in local DB
    await query('INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', 
      [userId, `user_${userId.substring(0, 5)}@explorify.com`, 'Explorer']
    );

    await query(
      'INSERT INTO community_members (community_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [communityId, userId]
    );
  }

  /**
   * Get all communities.
   */
  async listCommunities() {
    const result = await query('SELECT * FROM communities ORDER BY created_at DESC');
    return result.rows;
  }

  /**
   * Get community details including channels and member count.
   */
  async getCommunityDetails(communityId) {
    const communityResult = await query('SELECT * FROM communities WHERE id = $1', [communityId]);
    if (communityResult.rows.length === 0) return null;

    const channelsResult = await query('SELECT * FROM community_channels WHERE community_id = $1', [communityId]);
    const membersCount = await query('SELECT COUNT(*) FROM community_members WHERE community_id = $1', [communityId]);

    return {
      ...communityResult.rows[0],
      channels: channelsResult.rows,
      member_count: parseInt(membersCount.rows[0].count)
    };
  }

  /**
   * Aggregate preferences of all community members.
   * Replaces the old group preference aggregation logic.
   */
  async aggregatePreferences(communityId) {
    const members = await query(
      `SELECT u.preferences, u.accessibility_needs 
       FROM users u
       JOIN community_members cm ON u.id = cm.user_id
       WHERE cm.community_id = $1`,
      [communityId]
    );

    if (members.rows.length === 0) return {};

    const profile = {
      preferred_categories: new Set(),
      accessibility_min: 0,
      walking_speed_kmh: 4.5,
      is_community: true,
      member_count: members.rows.length
    };

    members.rows.forEach(m => {
      const prefs = m.preferences || {};
      (prefs.preferred_categories || []).forEach(c => profile.preferred_categories.add(c));
      profile.accessibility_min = Math.max(profile.accessibility_min, m.accessibility_needs || 0, prefs.accessibility_min || 0);
      const memberSpeed = prefs.walking_speed_kmh || 4.5;
      profile.walking_speed_kmh = Math.min(profile.walking_speed_kmh, memberSpeed);
    });

    profile.preferred_categories = Array.from(profile.preferred_categories);
    return profile;
  }
}

module.exports = new CommunityService();
