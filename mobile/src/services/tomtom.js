const API_KEY = process.env.EXPO_PUBLIC_TOMTOM_API_KEY;
const BASE = 'https://api.tomtom.com/search/2';

// Map TomTom category codes → our internal categories
const CATEGORY_MAP = {
  // Architecture / historic
  '7376': 'Architecture',
  '9902': 'Architecture',
  '7952': 'Architecture',
  // History / museum
  '7380': 'History',
  '7342': 'History',
  '7943': 'History',
  // Food
  '9362': 'Food',
  '9361': 'Food',
  '7315': 'Food',
  // Nature / outdoors
  '9379': 'Nature',
  '7460': 'Nature',
  '9563': 'Nature',
  '5512': 'Nature',
  // Art
  '7990': 'Art',
  '9927': 'Art',
  // Nightlife
  '9379': 'Nightlife',
  '9361049': 'Nightlife',
};

function mapCategory(poi) {
  if (!poi?.classifications) return 'Architecture';
  for (const cls of poi.classifications) {
    const mapped = CATEGORY_MAP[cls.code];
    if (mapped) return mapped;
    for (const name of cls.names || []) {
      const n = name.name?.toLowerCase() || '';
      if (n.includes('museum') || n.includes('monument') || n.includes('heritage')) return 'History';
      if (n.includes('restaurant') || n.includes('cafe') || n.includes('food')) return 'Food';
      if (n.includes('park') || n.includes('garden') || n.includes('nature')) return 'Nature';
      if (n.includes('art') || n.includes('gallery')) return 'Art';
      if (n.includes('night') || n.includes('bar') || n.includes('club')) return 'Nightlife';
      if (n.includes('church') || n.includes('castle') || n.includes('historic') || n.includes('arch')) return 'Architecture';
    }
  }
  return 'Architecture';
}

/**
 * Search for POIs near a location.
 * @param {number} lat
 * @param {number} lon
 * @param {number} radius - meters (max 50000)
 * @param {number} limit
 * @returns {Promise<Array>} normalized landmark objects
 */
export async function nearbySearch(lat, lon, radius = 1000, limit = 20) {
  const url =
    `${BASE}/nearbySearch/.json` +
    `?key=${API_KEY}` +
    `&lat=${lat}&lon=${lon}` +
    `&radius=${Math.min(radius, 50000)}` +
    `&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`TomTom nearbySearch error: ${res.status} ${body}`);
  }
  const json = await res.json();

  return (json.results || []).map((r, idx) => ({
    id: r.id || String(idx),
    name: r.poi?.name || r.address?.freeformAddress || 'Unknown Place',
    category: mapCategory(r.poi),
    lat: r.position?.lat,
    lon: r.position?.lon,
    distance: Math.round(r.dist || 0),
    address: r.address?.freeformAddress || '',
    tier: idx % 5 === 3 ? 'hidden' : idx % 3 === 1 ? 'discovered' : 'public',
    collected: false,
  }));
}

/**
 * Get details for a specific POI by TomTom ID.
 * Falls back to a fuzzy search if needed.
 */
export async function poiDetails(id) {
  // TomTom doesn't have a direct POI-by-id endpoint on Search v2 free tier;
  // use the id as a lookup via search
  const url =
    `${BASE}/search/${encodeURIComponent(id)}.json` +
    `?key=${API_KEY}&limit=1&typeahead=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const r = json.results?.[0];
    if (!r) return null;
    return {
      id: r.id,
      name: r.poi?.name || r.address?.freeformAddress,
      category: mapCategory(r.poi),
      address: r.address?.freeformAddress || '',
      lat: r.position?.lat,
      lon: r.position?.lon,
      phone: r.poi?.phone || null,
      url: r.poi?.url || null,
    };
  } catch {
    return null;
  }
}

/**
 * Calculate the distance in meters between two coordinates (Haversine).
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Convert a lat/lon offset from a center point to screen x/y (pixels).
 * @param {number} centerLat
 * @param {number} centerLon
 * @param {number} poiLat
 * @param {number} poiLon
 * @param {number} screenW - screen width in px
 * @param {number} screenH - screen height in px
 * @param {number} metersPerScreen - how many meters equals the full screen width
 */
export function toScreenCoords(centerLat, centerLon, poiLat, poiLon, screenW, screenH, metersPerScreen = 1000) {
  const metersPerDegLat = 111320;
  const metersPerDegLon = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const dx = (poiLon - centerLon) * metersPerDegLon;
  const dy = (poiLat - centerLat) * metersPerDegLat;

  const scale = screenW / metersPerScreen;

  return {
    x: screenW / 2 + dx * scale,
    y: screenH / 2 - dy * scale,
  };
}
