const { query } = require('../config/database');

class DriftDetectionService {
  async getDecayedCategoryCounts(userId, days) {
    const res = await query(
      `SELECT l.category,
        SUM(EXP(-EXTRACT(EPOCH FROM (NOW() - COALESCE(c.checked_in_at, c.visited_at))) / ($2 * 86400.0)))::float AS decayed_weight
       FROM collections c
       JOIN landmarks l ON l.id = c.landmark_id
       WHERE c.user_id = $1
       GROUP BY l.category`,
      [userId, days]
    );
    const result = {};
    res.rows.forEach(r => result[r.category] = r.decayed_weight);
    return result;
  }

  cosineSimilarity(vecA, vecB) {
    const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    let dotProduct = 0, normA = 0, normB = 0;
    
    for (const key of keys) {
      const a = vecA[key] || 0;
      const b = vecB[key] || 0;
      dotProduct += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  maxKey(obj) {
    let max = -Infinity, maxK = null;
    for (const k in obj) {
      if (obj[k] > max) {
        max = obj[k];
        maxK = k;
      }
    }
    return maxK;
  }

  async detectDrift(userId) {
    const recent  = await this.getDecayedCategoryCounts(userId, 30);   // last 30 days
    const allTime = await this.getDecayedCategoryCounts(userId, 365);  // all time

    if (Object.keys(recent).length === 0 || Object.keys(allTime).length === 0) {
      return { drifted: false };
    }

    const driftScore = this.cosineSimilarity(recent, allTime);
    if (driftScore < 0.7) {
      const newTop = this.maxKey(recent);
      const oldTop = this.maxKey(allTime);
      if (newTop && oldTop && newTop !== oldTop) {
        return { drifted: true, from: oldTop, to: newTop, score: driftScore };
      }
    }
    return { drifted: false, score: driftScore };
  }
}

module.exports = new DriftDetectionService();
