// Israeli cities coordinates (approximate center points)
// Using WGS84 coordinates
// With Google Maps Geocoding API fallback for unknown cities

import { geocodeCity, getRegionFromCoords, isGeocodingAvailable } from './geocodingService';

interface CityCoords {
  lat: number;
  lng: number;
  aliases?: string[];
  region?: string;
}

export const israeliCities: Record<string, CityCoords> = {
  // Major Cities
  'תל אביב': { lat: 32.0853, lng: 34.7818, region: 'center', aliases: ['תל אביב-יפו', 'תל-אביב', 'תא', 'תל אביב יפו', 'תל אביב - יפו', 'Tel Aviv', 'Tel Aviv-Yafo', 'Tel aviv', 'tel aviv', 'TLV', 'Ramat aviv', 'ramat aviv', 'רמת אביב'] },
  'ירושלים': { lat: 31.7683, lng: 35.2137, region: 'jerusalem', aliases: ['Jerusalem', 'Jérusalem', 'JLM', 'ירושליים'] },
  'חיפה': { lat: 32.7940, lng: 34.9896, region: 'north', aliases: ['Haifa', 'HFA'] },
  'באר שבע': { lat: 31.2518, lng: 34.7913, region: 'south', aliases: ['ב"ש', 'באר-שבע', 'בער שבע', 'בעיר שבה', 'Beer Sheva', 'Beersheba', "Be'er Scheva", "Be'er Sheva", "Be\u2019er Scheva", "Be\u2019er Sheva"] },
  'אשדוד': { lat: 31.8044, lng: 34.6553, region: 'south', aliases: ['Ashdod'] },
  'אשקלון': { lat: 31.6690, lng: 34.5715, region: 'south', aliases: ['Ashkelon'] },
  'נתניה': { lat: 32.3215, lng: 34.8532, region: 'center', aliases: ['Netanya', 'NETANYA', 'natanya'] },
  'הרצליה': { lat: 32.1663, lng: 34.8436, region: 'center', aliases: ['Herzliya', 'Hertzliya', 'Herzelya', 'herzliya', 'Herzelya pituach', 'הרצליה פיתוח'] },
  'פתח תקווה': { lat: 32.0841, lng: 34.8878, region: 'center', aliases: ['פ"ת', 'פתח-תקווה', 'Petah Tikva'] },
  'רמת גן': { lat: 32.0680, lng: 34.8241, region: 'center', aliases: ['רמת-גן', 'Ramat Gan', 'ramat gan'] },
  'רחובות': { lat: 31.8928, lng: 34.8113, region: 'center', aliases: ['Rehovot'] },
  'ראשון לציון': { lat: 31.9730, lng: 34.7925, region: 'center', aliases: ['ראשל"צ', 'ראשון-לציון', 'ראשון ציון', 'Rishon LeZion', 'Rishon LeTsiyon'] },
  'בת ים': { lat: 32.0167, lng: 34.7500, region: 'center', aliases: ['בת-ים', 'Bat Yam', 'Bat yam', 'bat yam'] },
  'הוד השרון': { lat: 32.1500, lng: 34.8833, region: 'center', aliases: ['הוד-השרון', 'Hod HaSharon'] },
  'רעננה': { lat: 32.1833, lng: 34.8667, region: 'center', aliases: ['Raanana', 'רעענה'] },
  'כפר סבא': { lat: 32.1833, lng: 34.9000, region: 'center', aliases: ['כפר-סבא', 'כ"ס', 'Kfar Saba'] },
  'חולון': { lat: 32.0167, lng: 34.7833, region: 'center', aliases: ['Holon'] },
  'בני ברק': { lat: 32.0833, lng: 34.8333, region: 'center', aliases: ['בני-ברק', 'ב"ב', 'Bnei Brak'] },
  'גבעתיים': { lat: 32.0667, lng: 34.8167, region: 'center', aliases: ['Givatayim', 'גבעתים'] },
  'עפולה': { lat: 32.6083, lng: 35.2889, region: 'north', aliases: ['Afula'] },
  'נצרת': { lat: 32.6996, lng: 35.3035, region: 'north', aliases: ['נצרת עילית', 'Nazareth', 'נוף הגליל'] },
  'עכו': { lat: 32.9278, lng: 35.0817, region: 'north', aliases: ['Acre', 'Akko'] },
  'נהריה': { lat: 33.0058, lng: 35.0983, region: 'north', aliases: ['Nahariya'] },
  'קריית שמונה': { lat: 33.2075, lng: 35.5697, region: 'north', aliases: ['קרית שמונה', 'Kiryat Shmona'] },
  'טבריה': { lat: 32.7950, lng: 35.5300, region: 'north', aliases: ['Tiberias'] },
  'צפת': { lat: 32.9658, lng: 35.4964, region: 'north', aliases: ['Safed', 'Tzfat'] },
  'כרמיאל': { lat: 32.9136, lng: 35.2961, region: 'north', aliases: ['Karmiel', "Karmi'el", "Karmi\u2019el", "Karmi\u2018el"] },
  'מעלות תרשיחא': { lat: 33.0167, lng: 35.2667, region: 'north', aliases: ['מעלות', 'Maalot'] },
  'אילת': { lat: 29.5581, lng: 34.9482, region: 'south', aliases: ['Eilat'] },
  'דימונה': { lat: 31.0667, lng: 35.0333, region: 'south', aliases: ['Dimona'] },
  'ערד': { lat: 31.2550, lng: 35.2128, region: 'south', aliases: ['Arad'] },
  'מצפה רמון': { lat: 30.6100, lng: 34.8017, region: 'south', aliases: ['Mitzpe Ramon'] },
  'קריית גת': { lat: 31.6100, lng: 34.7642, region: 'south', aliases: ['קרית גת', 'Kiryat Gat'] },
  'שדרות': { lat: 31.5256, lng: 34.5961, region: 'south', aliases: ['Sderot'] },
  'אופקים': { lat: 31.3167, lng: 34.6167, region: 'south', aliases: ['Ofakim'] },
  'ירוחם': { lat: 30.9875, lng: 34.9297, region: 'south', aliases: ['Yeruham'] },

  // Center Region
  'גבעת שמואל': { lat: 32.0758, lng: 34.8467, region: 'center', aliases: ['גבעת-שמואל', 'Givat Shmuel'] },
  'קריית אונו': { lat: 32.0500, lng: 34.8667, region: 'center', aliases: ['קרית אונו', 'Kiryat Ono'] },
  'יהוד': { lat: 32.0333, lng: 34.8833, region: 'center', aliases: ['יהוד מונוסון', 'יהוד-מונוסון', 'Yehud'] },
  'אור יהודה': { lat: 32.0333, lng: 34.8500, region: 'center', aliases: ['Or Yehuda'] },
  'אזור': { lat: 32.0333, lng: 34.8000, region: 'center', aliases: ['Azor'] },
  'לוד': { lat: 31.9500, lng: 34.8833, region: 'center', aliases: ['Lod'] },
  'רמלה': { lat: 31.9333, lng: 34.8667, region: 'center', aliases: ['Ramla', 'Ramle'] },
  'מודיעין': { lat: 31.8928, lng: 35.0106, region: 'center', aliases: ['מודיעין מכבים רעות', 'מודיעין-מכבים-רעות', 'מודיעין מכבים-רעות', 'Modiin', "מודיעין-מכבים-רעות'"] },
  'שוהם': { lat: 31.9958, lng: 34.9478, region: 'center', aliases: ['Shoham'] },
  'ראש העין': { lat: 32.0833, lng: 34.9500, region: 'center', aliases: ['ראש-העין', 'ראש עין', 'Rosh HaAyin'] },
  'אלעד': { lat: 32.0500, lng: 34.9500, region: 'center', aliases: ['Elad'] },
  'ביתר עילית': { lat: 31.6994, lng: 35.1200, region: 'jerusalem', aliases: ['Beitar Illit'] },
  'בית שמש': { lat: 31.7500, lng: 34.9833, region: 'jerusalem', aliases: ['בית-שמש', 'Beit Shemesh'] },
  'יבנה': { lat: 31.8833, lng: 34.7333, region: 'center', aliases: ['Yavne'] },
  'נס ציונה': { lat: 31.9333, lng: 34.8000, region: 'center', aliases: ['Ness Ziona'] },
  'גדרה': { lat: 31.8167, lng: 34.7833, region: 'center', aliases: ['Gedera'] },
  'מבשרת ציון': { lat: 31.8000, lng: 35.1500, region: 'jerusalem', aliases: ['Mevaseret Zion'] },

  // Sharon Region
  'רמת השרון': { lat: 32.1333, lng: 34.8333, region: 'center', aliases: ['רמת-השרון', 'Ramat HaSharon'] },
  'כפר יונה': { lat: 32.3167, lng: 34.9333, region: 'center', aliases: ['Kfar Yona'] },
  'זכרון יעקב': { lat: 32.5711, lng: 34.9506, region: 'north', aliases: ['Zichron Yaakov'] },
  'קיסריה': { lat: 32.5000, lng: 34.9000, region: 'north', aliases: ['Caesarea'] },
  'אור עקיבא': { lat: 32.5000, lng: 34.9167, region: 'north', aliases: ['Or Akiva'] },
  'חדרה': { lat: 32.4333, lng: 34.9167, region: 'center', aliases: ['Hadera'] },
  'פרדס חנה': { lat: 32.4667, lng: 34.9833, region: 'center', aliases: ['פרדס חנה כרכור', 'פרדס חנה-כרכור', 'Pardes Hanna'] },
  'קדימה צורן': { lat: 32.2833, lng: 34.9167, region: 'center', aliases: ['קדימה-צורן', 'Kadima Zoran', 'קדימה'] },
  'עין החורש': { lat: 32.3833, lng: 34.9333, region: 'center', aliases: ['Ein HaHoresh'] },
  'בנימינה': { lat: 32.5167, lng: 34.9500, region: 'north', aliases: ['בנימינה-גבעת עדה', 'Binyamina'] },

  // Haifa Area
  'קריית אתא': { lat: 32.8000, lng: 35.1000, region: 'north', aliases: ['קרית אתא', 'Kiryat Ata'] },
  'קריית ביאליק': { lat: 32.8333, lng: 35.0833, region: 'north', aliases: ['קרית ביאליק', 'Kiryat Bialik'] },
  'קריית מוצקין': { lat: 32.8333, lng: 35.0667, region: 'north', aliases: ['קרית מוצקין', 'Kiryat Motzkin'] },
  'קריית ים': { lat: 32.8500, lng: 35.0667, region: 'north', aliases: ['קרית ים', 'Kiryat Yam'] },
  'קריית חיים': { lat: 32.8333, lng: 35.0833, region: 'north', aliases: ['קרית חיים', 'Kiryat Haim'] },
  'טירת כרמל': { lat: 32.7667, lng: 34.9667, region: 'north', aliases: ['טירת הכרמל', 'גבעת אבני/טירת כרמל', 'גבעת אבני', 'Tirat Carmel'] },
  'נשר': { lat: 32.7667, lng: 35.0333, region: 'north', aliases: ['Nesher'] },
  'יקנעם': { lat: 32.6500, lng: 35.1000, region: 'north', aliases: ['יקנעם עילית', 'Yokneam'] },

  // North
  'מגדל העמק': { lat: 32.6833, lng: 35.2333, region: 'north', aliases: ['Migdal HaEmek'] },
  'בית שאן': { lat: 32.5000, lng: 35.5000, region: 'north', aliases: ['בית-שאן', 'Beit Shean'] },
  'קצרין': { lat: 32.9917, lng: 35.6833, region: 'north', aliases: ['Katzrin'] },
  'שלומי': { lat: 33.0750, lng: 35.1417, region: 'north', aliases: ['Shlomi'] },
  'מעלה החמישה': { lat: 31.8133, lng: 35.1000, region: 'jerusalem' },
  'ירכא': { lat: 32.9500, lng: 35.1833, region: 'north', aliases: ['Yarka', 'ירכה'] },
  'פקיעין': { lat: 32.9833, lng: 35.3167, region: 'north', aliases: ['Pekiin'] },
  'סכנין': { lat: 32.8667, lng: 35.3000, region: 'north', aliases: ['Sakhnin'] },

  // South
  'קריית מלאכי': { lat: 31.7333, lng: 34.7500, region: 'south', aliases: ['קרית מלאכי', 'Kiryat Malachi'] },
  'נתיבות': { lat: 31.4167, lng: 34.5833, region: 'south', aliases: ['Netivot'] },
  'רהט': { lat: 31.3833, lng: 34.7500, region: 'south', aliases: ['Rahat'] },
  'מיתר': { lat: 31.3250, lng: 34.9333, region: 'south', aliases: ['Meitar'] },
  'באר טוביה': { lat: 31.7333, lng: 34.7333, region: 'south', aliases: ['Beer Tuvia'] },

  // West Bank (Settlement areas)
  'אריאל': { lat: 32.1053, lng: 35.1736, region: 'center', aliases: ['Ariel'] },
  'מעלה אדומים': { lat: 31.7833, lng: 35.3000, region: 'jerusalem', aliases: ['מעלה-אדומים', 'Maale Adumim'] },
  'גוש עציון': { lat: 31.6500, lng: 35.1167, region: 'jerusalem', aliases: ['Gush Etzion'] },
  'אפרת': { lat: 31.6500, lng: 35.1500, region: 'jerusalem', aliases: ['Efrat'] },
  'גבעת זאב': { lat: 31.8617, lng: 35.1700, region: 'jerusalem', aliases: ['Givat Zeev'] },
  'בית אל': { lat: 31.9333, lng: 35.2167, region: 'jerusalem', aliases: ['Beit El'] },
  'עלי': { lat: 32.0833, lng: 35.2667, region: 'center', aliases: ['Eli'] },

  // Kibbutzim and small locations
  'שריד': { lat: 32.6333, lng: 35.1833, region: 'north', aliases: ['שריד- קיבוץ', 'קיבוץ שריד'] },
  'גלגל': { lat: 31.9833, lng: 35.4500, region: 'center' },
  'חוות מעון': { lat: 31.4000, lng: 34.7833, region: 'south' },
  'שורש': { lat: 31.7833, lng: 35.0500, region: 'jerusalem', aliases: ['Shoresh'] },
  'נחשונים': { lat: 32.0333, lng: 34.9500, region: 'center', aliases: ['Nahshonim'] },
  'אבן יהודה': { lat: 32.2833, lng: 34.8833, region: 'center', aliases: ['Even Yehuda'] },
  'גני תקווה': { lat: 32.0667, lng: 34.8833, region: 'center', aliases: ['Ganei Tikva'] },
  'סביון': { lat: 32.0500, lng: 34.8500, region: 'center', aliases: ['Savyon'] },
  'כוכב יאיר': { lat: 32.2167, lng: 34.9833, region: 'center', aliases: ['כוכב יאיר-צור יגאל', 'Kokhav Yair'] },
  'גבעת עדה': { lat: 32.5167, lng: 34.9500, region: 'north', aliases: ['Givat Ada'] },
  'עתלית': { lat: 32.7000, lng: 34.9333, region: 'north', aliases: ['Atlit'] },
  'כפר ויתקין': { lat: 32.3833, lng: 34.8667, region: 'center', aliases: ['Kfar Vitkin'] },
  'משמר השרון': { lat: 32.3667, lng: 34.8833, region: 'center', aliases: ['Mishmar HaSharon'] },
  'יפו': { lat: 32.0500, lng: 34.7500, region: 'center', aliases: ['Jaffa', 'Yafo'] },
  'תל מונד': { lat: 32.2500, lng: 34.9167, region: 'center', aliases: ['Tel Mond'] },
  'גבעת שמש': { lat: 31.7333, lng: 35.0333, region: 'jerusalem', aliases: ['Givat Shemesh'] },
  'כפר שמריהו': { lat: 32.1833, lng: 34.8333, region: 'center', aliases: ['Kfar Shmaryahu'] },
  'אבן ספיר': { lat: 31.7500, lng: 35.1333, region: 'jerusalem', aliases: ['Even Sapir'] },
  'עמנואל': { lat: 32.1500, lng: 35.1500, region: 'center', aliases: ['Emanuel'] },
  'קרני שומרון': { lat: 32.1667, lng: 35.1000, region: 'center', aliases: ['Karnei Shomron'] },
  'אלקנה': { lat: 32.1167, lng: 35.0333, region: 'center', aliases: ['Elkana'] },

  // Additional kibbutzim and locations from uploaded data
  'עין צורים': { lat: 31.6667, lng: 34.6500, region: 'south', aliases: ['Ein Tzurim', 'קיבוץ עין צורים'] },
  'שלוחות': { lat: 32.4333, lng: 35.5167, region: 'north', aliases: ['Shluchot', 'קיבוץ שלוחות', 'Kibbutz shluchot'] },
  'חנתון': { lat: 32.7667, lng: 35.2333, region: 'north', aliases: ['Hannaton', 'קיבוץ חנתון'] },
  'גשר הזיו': { lat: 33.0500, lng: 35.1000, region: 'north', aliases: ['Gesher haziv', 'גשר הזיב', 'קיבוץ גשר א-זיב', 'קיבוץ גשר הזיו'] },
  'ברקאי': { lat: 32.4667, lng: 35.0333, region: 'north', aliases: ['Barkai', 'קיבוץ ברקאי'] },
  'מעוז חיים': { lat: 32.4667, lng: 35.5333, region: 'north', aliases: ['Maoz Haim', 'קיבוץ מעוז חיים'] },
  'סעד': { lat: 31.4667, lng: 34.5667, region: 'south', aliases: ['Saad', 'קיבוץ סעד'] },
  'חצור': { lat: 31.7500, lng: 34.7667, region: 'south', aliases: ['Hatzor', 'חצור אשדוד', 'קיבוץ חצור', 'קיבוץ חצור אשדוד'] },
  'מגידו': { lat: 32.5833, lng: 35.1833, region: 'north', aliases: ['Megiddo', 'צומת מגידו', 'קיבוץ מגידו'] },
  'בארות יצחק': { lat: 32.0667, lng: 34.9333, region: 'center', aliases: ['Beerot Yitzhak'] },
  'נופי נחמיה': { lat: 32.0333, lng: 34.9167, region: 'center', aliases: ['Nofei Nehemia'] },
};

// Strip invisible Unicode characters (RTL marks, zero-width chars, etc.)
function stripInvisibleChars(str: string): string {
  // Remove: RTL mark (200F), LTR mark (200E), zero-width space (200B),
  // zero-width non-joiner (200C), zero-width joiner (200D),
  // BOM (FEFF), other directional marks
  return str.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD]/g, '');
}

// Normalize city name for matching
export function normalizeCityName(city: string): string {
  if (!city) return '';

  // Strip invisible Unicode characters first
  let normalized = stripInvisibleChars(city).trim();

  // Normalize smart quotes to regular apostrophes
  normalized = normalized.replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  if (!normalized) return '';

  // Handle compound cities with "/" (e.g., "מודיעין-מכבים-רעות/ אריאל" -> take first part)
  if (normalized.includes('/')) {
    normalized = normalized.split('/')[0].trim();
  }

  // Handle compound cities with "," (e.g., "חדרה, חולון" -> take first part)
  if (normalized.includes(',')) {
    normalized = normalized.split(',')[0].trim();
  }

  // Remove "קיבוץ " prefix for matching
  const withoutKibbutz = normalized.replace(/^קיבוץ\s+/, '').trim();

  const searchTerms = [normalized, withoutKibbutz];

  // Check for exact match first (case-insensitive)
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    for (const [name, data] of Object.entries(israeliCities)) {
      if (name.toLowerCase() === lowerTerm) {
        return name;
      }
      if (data.aliases) {
        for (const alias of data.aliases) {
          if (alias.toLowerCase() === lowerTerm) {
            return name;
          }
        }
      }
    }
  }

  // Fuzzy match - check if the city contains or is contained in known cities
  for (const term of searchTerms) {
    const lowerTerm = term.toLowerCase();
    for (const [name, data] of Object.entries(israeliCities)) {
      if (name.toLowerCase().includes(lowerTerm) || lowerTerm.includes(name.toLowerCase())) {
        return name;
      }
      if (data.aliases) {
        for (const alias of data.aliases) {
          if (alias.toLowerCase().includes(lowerTerm) || lowerTerm.includes(alias.toLowerCase())) {
            return name;
          }
        }
      }
    }
  }

  return city.trim(); // Return original if no match found
}

// Get city coordinates - first tries local mapping, then falls back to Google Maps API
export function getCityCoords(city: string): CityCoords | null {
  const normalized = normalizeCityName(city);
  return israeliCities[normalized] || null;
}

// Async version that falls back to Google Maps API
export async function getCityCoordsAsync(city: string): Promise<CityCoords | null> {
  // Try local mapping first
  const local = getCityCoords(city);
  if (local) return local;

  // Try Google Maps Geocoding API as fallback
  if (!isGeocodingAvailable()) return null;

  const cleanCity = stripInvisibleChars(city).trim();
  if (!cleanCity) return null;

  const result = await geocodeCity(cleanCity);
  if (result) {
    const region = getRegionFromCoords(result.lat, result.lng);

    // Add to local cache for future use in this session
    const coords: CityCoords = {
      lat: result.lat,
      lng: result.lng,
      region,
    };
    israeliCities[cleanCity] = coords;

    return coords;
  }

  return null;
}

// Get region for a city
export function getCityRegion(city: string): string | null {
  const coords = getCityCoords(city);
  if (coords?.region) return coords.region;

  // Fallback: estimate region from coordinates
  if (coords) {
    return getRegionFromCoords(coords.lat, coords.lng);
  }

  return null;
}

// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Get distance between two cities (sync - local mapping only)
export function getCityDistance(city1: string, city2: string): number | null {
  const coords1 = getCityCoords(city1);
  const coords2 = getCityCoords(city2);

  if (!coords1 || !coords2) {
    return null;
  }

  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

// Get distance between two cities (async - with Google Maps fallback)
export async function getCityDistanceAsync(city1: string, city2: string): Promise<number | null> {
  const coords1 = await getCityCoordsAsync(city1);
  const coords2 = await getCityCoordsAsync(city2);

  if (!coords1 || !coords2) {
    return null;
  }

  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}

// Check if distance is within acceptable range
export function isDistanceAcceptable(city1: string, city2: string, maxDistance: number = 150): boolean {
  const distance = getCityDistance(city1, city2);
  if (distance === null) return true; // If we can't calculate, don't reject
  return distance <= maxDistance;
}

// Get distance score (higher is better, 0-100)
export function getDistanceScore(city1: string, city2: string): number {
  const distance = getCityDistance(city1, city2);

  if (distance === null) return 50; // Unknown distance, neutral score
  if (distance > 150) return 0; // Too far
  if (distance <= 10) return 100; // Same city or very close
  if (distance <= 30) return 90; // Very close
  if (distance <= 50) return 80; // Close (preferred)
  if (distance <= 75) return 60;
  if (distance <= 100) return 40;
  if (distance <= 150) return 20;

  return 0;
}

// Resolve all unknown cities via Google Maps API (batch)
export async function resolveUnknownCities(cityNames: string[]): Promise<{
  resolved: number;
  failed: string[];
}> {
  const failed: string[] = [];
  let resolved = 0;

  for (const city of cityNames) {
    const clean = stripInvisibleChars(city).trim();
    if (!clean) continue;

    // Skip if already in local mapping
    if (getCityCoords(clean)) continue;

    const coords = await getCityCoordsAsync(clean);
    if (coords) {
      resolved++;
    } else {
      failed.push(clean);
    }
  }

  return { resolved, failed };
}
