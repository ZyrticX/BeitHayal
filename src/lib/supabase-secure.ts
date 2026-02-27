import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// ===========================================
// Secure Types - No PII in cloud!
// ===========================================

// What goes to Supabase (cloud) - NO PERSONAL INFO
export interface SecureStudent {
  id: string;
  external_id: string;          // Salesforce ID only
  gender: string | null;        // M/F
  city_code: string | null;     // TLV, HFA, etc.
  region: string | null;        // north/center/south
  mother_tongue_code: string | null;  // HE/RU/UK/EN
  current_soldiers_count: number;
  is_scholarship_active: boolean;
  max_soldiers: number;
  available_slots: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SecureSoldier {
  id: string;
  external_id: string;
  gender: string | null;
  city_code: string | null;
  region: string | null;
  mother_tongue_code: string | null;
  language_preference_code: string | null;
  volunteer_gender_preference: string | null;  // male/female/any
  status: string;
  has_special_requests: boolean;
  special_request_flags: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

export interface SecureMatch {
  id: string;
  student_id: string;
  soldier_id: string;
  confidence_score: number;
  match_rank: number;
  match_criteria: MatchCriteria;
  status: 'suggested' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface MatchCriteria {
  language_match: boolean;
  distance_score: number;
  gender_pref_match: boolean;
  region_match: boolean;
}

// ===========================================
// Local Types - PII stays local in browser only!
// ===========================================

// Full student data (only in browser memory, from Excel)
export interface LocalStudent {
  // From Excel - stays local
  contact_id: string;           // מזהה איש קשר (Salesforce)
  full_name?: string;           // שם מלא
  phone?: string;               // טלפון
  email?: string;               // מייל
  full_address?: string;        // כתובת מלאה
  coordinator?: string;         // רכז
  notes?: string;               // הערות
  
  // Matching data - can go to cloud as codes
  gender: string | null;
  city: string | null;          // Full city name for display
  city_code?: string;           // Code for cloud
  region?: string;
  origin_country: string | null;
  languages: string | null;
  mother_tongue: string | null;
  mother_tongue_code?: string;  // Code for cloud
  current_soldiers_count: number;
  is_scholarship_active: boolean;
  max_soldiers: number;
  available_slots: number;
  volunteer_status: string | null;
}

export interface LocalSoldier {
  // From Excel - stays local
  contact_id: string;
  full_name?: string;
  phone?: string;
  email?: string;
  full_address?: string;
  coordinator?: string;
  notes?: string;
  special_requests?: string;    // Free text - stays local!
  
  // Matching data
  gender: string | null;
  city: string | null;
  city_code?: string;
  region?: string;
  origin_country: string | null;
  mother_tongue: string | null;
  mother_tongue_code?: string;
  language_preference: string | null;
  volunteer_gender_preference: string | null;
  soldier_status: string | null;
  has_special_requests: boolean;
}

// Combined view for UI (joins cloud match with local data)
export interface EnrichedMatch {
  id: string;
  student_external_id: string;
  soldier_external_id: string;
  confidence_score: number;
  match_rank: number;
  match_criteria: MatchCriteria;
  status: 'suggested' | 'approved' | 'rejected';
  
  // Enriched from local data (for display only)
  student?: LocalStudent;
  soldier?: LocalSoldier;
}

// ===========================================
// Code Mappings
// ===========================================

import { normalizeCityName, getCityCoords, getCityRegion, israeliCities } from './cityDistance';

export const LANGUAGE_CODES: Record<string, string> = {
  'עברית': 'HE',
  'עיברית': 'HE',    // שגיאת כתיב נפוצה
  'אנגלית': 'EN',
  'רוסית': 'RU',
  'אוקראינית': 'UK',
  'צרפתית': 'FR',
  'ספרדית': 'ES',
  'ערבית': 'AR',
  'אמהרית': 'AM',
  'פרסית': 'FA',
  'גרמנית': 'DE',
  'איטלקית': 'IT',
  'פורטוגזית': 'PT',
  'סינית': 'ZH',
  'יפנית': 'JA',
  'בולגרית': 'BG',
  'הולנדית': 'NL',
  'דנית': 'DA',
  'טורקית': 'TR',
  'קרואטית': 'HR',
  'רומנית': 'RO',
  'פולנית': 'PL',
  'הונגרית': 'HU',
  'תאילנדית': 'TH',
  'קוריאנית': 'KO',
  'הינדית': 'HI',
};

// City code generation - uses normalization from cityDistance.ts
function generateCityCode(cityName: string): string {
  // Generate a 3-letter code from the city name
  const clean = cityName.replace(/[^א-תa-zA-Z]/g, '');
  return clean.substring(0, 3).toUpperCase();
}

// Track dynamically discovered languages (not in the predefined list)
const dynamicLanguageCodes = new Map<string, string>();

// Generate a language code from a Hebrew name (first 2 letters uppercased)
function generateLanguageCode(hebrewName: string): string {
  // Use first 2 characters as a fallback code
  const clean = hebrewName.replace(/[^א-תa-zA-Z]/g, '');
  if (clean.length >= 2) {
    return clean.substring(0, 2).toUpperCase();
  }
  return clean.toUpperCase() || 'XX';
}

// Helper functions
export function getLanguageCode(hebrewName: string | null): string | null {
  if (!hebrewName) return null;
  const trimmed = hebrewName.trim();

  // Try exact match in predefined codes first
  if (LANGUAGE_CODES[trimmed]) return LANGUAGE_CODES[trimmed];

  // Try dynamic codes (previously auto-detected languages)
  if (dynamicLanguageCodes.has(trimmed)) return dynamicLanguageCodes.get(trimmed)!;

  // Handle multi-language fields (e.g. "איטלקית פורטוגזית", "אנגלית גרמנית")
  // Try splitting by space and matching the first language
  const parts = trimmed.split(/\s+/);
  if (parts.length > 1) {
    for (const part of parts) {
      if (LANGUAGE_CODES[part]) return LANGUAGE_CODES[part];
      if (dynamicLanguageCodes.has(part)) return dynamicLanguageCodes.get(part)!;
    }
  }

  // Try splitting by semicolon (e.g. "אנגלית; ספרדית")
  const semiParts = trimmed.split(/[;,]/);
  if (semiParts.length > 1) {
    const first = semiParts[0].trim();
    if (LANGUAGE_CODES[first]) return LANGUAGE_CODES[first];
    if (dynamicLanguageCodes.has(first)) return dynamicLanguageCodes.get(first)!;
  }

  // Auto-generate a code for unknown languages so they can still be matched
  // (two soldiers/students with the same unknown language will match each other)
  const autoCode = generateLanguageCode(trimmed);
  dynamicLanguageCodes.set(trimmed, autoCode);
  console.warn(`[Language] שפה לא מוכרת "${trimmed}" - נוצר קוד אוטומטי: ${autoCode}`);

  return autoCode;
}

// Get all discovered dynamic languages (for debugging/display)
export function getDynamicLanguages(): Map<string, string> {
  return new Map(dynamicLanguageCodes);
}

export function getCityInfo(cityName: string | null): { code: string; region: string } | null {
  if (!cityName) return null;

  // Use the improved normalization from cityDistance.ts
  const normalized = normalizeCityName(cityName);
  const coords = israeliCities[normalized];

  if (coords) {
    // Generate a code from the normalized city name
    const code = generateCityCode(normalized);
    const region = coords.region || 'center';
    return { code, region };
  }

  // If normalization found a match (normalized !== original), try coords lookup
  const directCoords = getCityCoords(cityName);
  if (directCoords) {
    const region = getCityRegion(cityName) || 'center';
    const code = generateCityCode(cityName);
    return { code, region };
  }

  return null;
}

export function getGenderCode(hebrewGender: string | null): string | null {
  if (!hebrewGender) return null;
  if (hebrewGender === 'זכר') return 'M';
  if (hebrewGender === 'נקבה') return 'F';
  return null;
}

export function getVolunteerPreferenceCode(pref: string | null): string | null {
  if (!pref) return null;
  if (pref === 'מתנדב') return 'male';
  if (pref === 'מתנדבת') return 'female';
  if (pref === 'לא חשוב') return 'any';
  return 'any';
}
