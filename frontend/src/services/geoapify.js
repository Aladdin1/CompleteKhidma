/**
 * Geoapify integration for maps, geocoding, and address search.
 * Used in tasker flow (MapPicker / Profile) and client flow (LocationMap / ServiceDetails).
 */

const GEOAPIFY_API_KEY =
  import.meta.env.VITE_GEOAPIFY_API_KEY || '3aeebf8d01c54aecae8434f78f639aa2';
const BASE = 'https://api.geoapify.com/v1';

/** Egypt country code for filter (map and search limited to Egypt only). */
export const EGYPT_COUNTRY_CODE = 'eg';

/** Egypt approximate bounds: [[south, west], [north, east]] for Leaflet maxBounds. */
export const EGYPT_BOUNDS = [
  [22.0, 24.7],   // SW (Aswan / Siwa)
  [31.7, 37.0],   // NE (Mediterranean / Sinai)
];

export function getGeoapifyApiKey() {
  return GEOAPIFY_API_KEY;
}

/**
 * Geoapify tile URL for Leaflet TileLayer.
 * @param {string} style - e.g. 'osm-bright', 'osm-bright-smooth'
 */
export function getGeoapifyTileUrl(style = 'osm-bright') {
  return `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`;
}

/**
 * Geoapify static map image URL (for non-Leaflet usage).
 */
export function getGeoapifyStaticMapUrl({ lat, lng, zoom = 14, width = 800, height = 400, marker = true }) {
  const center = `lonlat:${lng},${lat}`;
  let url = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${width}&height=${height}&center=${center}&zoom=${zoom}&apiKey=${GEOAPIFY_API_KEY}`;
  if (marker) {
    url += `&marker=lonlat:${lng},${lat};type:awesome;color:%23ff0000;size:medium`;
  }
  return url;
}

/**
 * Address autocomplete / search. Returns GeoJSON FeatureCollection.
 * @param {string} text - Search query
 * @param {{ limit?: number, lat?: number, lon?: number, radius?: number }} options - Optional bias and limit
 */
export async function geoapifyAutocomplete(text, options = {}) {
  const { limit = 8, lat, lon, radius = 50000, countryCode = EGYPT_COUNTRY_CODE } = options;
  const params = new URLSearchParams({
    text: text.trim(),
    apiKey: GEOAPIFY_API_KEY,
    limit: String(limit),
    format: 'json',
    lang: 'en',
  });
  if (countryCode) {
    params.set('filter', `countrycode:${countryCode}`);
  }
  if (lat != null && lon != null) {
    params.set('bias', `proximity:${lon},${lat}`);
  }
  const res = await fetch(`${BASE}/geocode/autocomplete?${params}`);
  if (!res.ok) throw new Error('Geoapify autocomplete failed');
  const data = await res.json();
  return data;
}

/**
 * Geocode search (single query, returns first result or list).
 * @param {string} text - Address or place name
 * @param {{ limit?: number }} options
 */
export async function geoapifyGeocode(text, options = {}) {
  const { limit = 5, countryCode = EGYPT_COUNTRY_CODE } = options;
  const params = new URLSearchParams({
    text: text.trim(),
    apiKey: GEOAPIFY_API_KEY,
    limit: String(limit),
    format: 'json',
  });
  if (countryCode) {
    params.set('filter', `countrycode:${countryCode}`);
  }
  const res = await fetch(`${BASE}/geocode/search?${params}`);
  if (!res.ok) throw new Error('Geoapify geocode failed');
  const data = await res.json();
  return data;
}

/**
 * Reverse geocode: lat,lng -> address string.
 * @param {number} lat
 * @param {number} lng
 */
export async function geoapifyReverse(lat, lng) {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    apiKey: GEOAPIFY_API_KEY,
    format: 'json',
  });
  const res = await fetch(`${BASE}/geocode/reverse?${params}`);
  if (!res.ok) throw new Error('Geoapify reverse failed');
  const data = await res.json();
  const f = data?.results?.[0];
  if (!f) return null;
  return {
    formatted: f.formatted,
    address_line1: f.address_line1,
    address_line2: f.address_line2,
    city: f.city,
    state: f.state,
    country: f.country,
    lat: parseFloat(f.lat),
    lon: parseFloat(f.lon),
  };
}

/**
 * Normalize Geoapify result to { lat, lon, display_name } for MapPicker/UI.
 * Geoapify returns .results[] with .lat, .lon, .formatted (or .address_line1, etc.)
 */
export function normalizeGeoapifyResult(r) {
  const lat = r.lat != null ? parseFloat(r.lat) : null;
  const lon = r.lon != null ? parseFloat(r.lon) : null;
  const display_name = r.formatted || [r.address_line1, r.address_line2, r.city, r.country].filter(Boolean).join(', ') || `${lat}, ${lon}`;
  return { lat, lon, display_name, ...r };
}

/**
 * Autocomplete: returns array of { lat, lon, display_name } for dropdown.
 */
export async function searchAddresses(text, options = {}) {
  const data = await geoapifyAutocomplete(text, { ...options, limit: options.limit ?? 8 });
  const raw = data.results || (data.features || []).map((f) => f.properties || f);
  return raw.map((r) => {
    const n = normalizeGeoapifyResult(r);
    return { lat: n.lat, lon: n.lon, display_name: n.display_name, ...n };
  });
}

/**
 * Single geocode search: returns first result or null.
 */
export async function searchAddress(text) {
  const data = await geoapifyGeocode(text, { limit: 1 });
  const raw = data.results || (data.features || []).map((f) => f.properties || f);
  const first = raw[0];
  if (!first) return null;
  const n = normalizeGeoapifyResult(first);
  return { lat: n.lat, lon: n.lon, display_name: n.display_name, ...n };
}

/**
 * Reverse geocode to formatted address string.
 */
export async function reverseGeocodeToAddress(lat, lng) {
  const r = await geoapifyReverse(lat, lng);
  return r ? r.formatted : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
