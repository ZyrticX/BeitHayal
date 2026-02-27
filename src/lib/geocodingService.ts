// ===========================================
// Google Maps Geocoding Service
// Fallback for cities not in the local mapping
// ===========================================

interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  cityName: string;
}

// Cache geocoding results to avoid repeated API calls
const geocodingCache = new Map<string, GeocodingResult | null>();

// Get Google Maps API key from environment
function getApiKey(): string | null {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return key || null;
}

/**
 * Geocode a city name using Google Maps Geocoding API
 * Restricted to Israel for accuracy
 */
export async function geocodeCity(cityName: string): Promise<GeocodingResult | null> {
  // Check cache first
  const cacheKey = cityName.trim().toLowerCase();
  if (geocodingCache.has(cacheKey)) {
    return geocodingCache.get(cacheKey) || null;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[Geocoding] No Google Maps API key configured (VITE_GOOGLE_MAPS_API_KEY)');
    geocodingCache.set(cacheKey, null);
    return null;
  }

  try {
    // Add "Israel" to the query for better results
    const query = encodeURIComponent(`${cityName}, Israel`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&region=il&language=he&key=${apiKey}`;

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[Geocoding] HTTP error: ${response.status}`);
      geocodingCache.set(cacheKey, null);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn(`[Geocoding] No results for "${cityName}": ${data.status}`);
      geocodingCache.set(cacheKey, null);
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    // Extract city name from address components
    let resolvedCityName = cityName;
    for (const component of result.address_components) {
      if (component.types.includes('locality')) {
        resolvedCityName = component.long_name;
        break;
      }
    }

    const geocodingResult: GeocodingResult = {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
      cityName: resolvedCityName,
    };

    // Cache the result
    geocodingCache.set(cacheKey, geocodingResult);
    console.log(`[Geocoding] Resolved "${cityName}" -> ${resolvedCityName} (${location.lat}, ${location.lng})`);

    return geocodingResult;
  } catch (error) {
    console.error(`[Geocoding] Error for "${cityName}":`, error);
    geocodingCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Batch geocode multiple city names
 * Uses a small delay between requests to respect rate limits
 */
export async function geocodeCities(cityNames: string[]): Promise<Map<string, GeocodingResult | null>> {
  const results = new Map<string, GeocodingResult | null>();
  const uniqueCities = [...new Set(cityNames.map(c => c.trim()))].filter(c => c.length > 0);

  for (const city of uniqueCities) {
    const result = await geocodeCity(city);
    results.set(city, result);

    // Small delay to avoid rate limiting (50ms between requests)
    if (result !== null) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  return results;
}

/**
 * Determine region based on coordinates (for Israel)
 */
export function getRegionFromCoords(lat: number, lng: number): string {
  // Rough region boundaries for Israel
  if (lat >= 32.5) return 'north';
  if (lat >= 31.6 && lat < 32.5) {
    if (lng > 35.1) return 'jerusalem';
    return 'center';
  }
  return 'south';
}

/**
 * Generate a city code from a city name
 */
export function generateCityCode(cityName: string): string {
  // Use first 3 consonants or characters as code
  const clean = cityName.replace(/[^א-תa-zA-Z]/g, '');
  return clean.substring(0, 3).toUpperCase();
}

/**
 * Check if Google Maps API is configured
 */
export function isGeocodingAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Clear the geocoding cache
 */
export function clearGeocodingCache(): void {
  geocodingCache.clear();
}
