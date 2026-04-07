import { supabase } from './supabase-secure';

export interface MatchingSettings {
  baseScoreFull: number;           // gender + language match (default: 100)
  baseScoreLanguageOnly: number;   // only language match (default: 70)
  baseScoreGenderOnly: number;     // only gender match (default: 60)
  distanceNoPenaltyKm: number;     // no penalty under this (default: 5)
  distancePenaltyDivisor: number;  // penalty = distance / this (default: 2)
  maxDistanceKm: number;           // max distance cap (default: 150)
  matchesPerSoldier: number;       // matches per soldier (default: 2)
  minFinalScore: number;           // minimum score floor (default: 1)
  highScoreThreshold: number;      // high quality cutoff (default: 70)
  mediumScoreThreshold: number;    // medium quality cutoff (default: 30)
}

export const DEFAULT_SETTINGS: MatchingSettings = {
  baseScoreFull: 100,
  baseScoreLanguageOnly: 70,
  baseScoreGenderOnly: 60,
  distanceNoPenaltyKm: 5,
  distancePenaltyDivisor: 2,
  maxDistanceKm: 150,
  matchesPerSoldier: 2,
  minFinalScore: 1,
  highScoreThreshold: 70,
  mediumScoreThreshold: 30,
};

const SETTINGS_KEY_MAP: Record<keyof MatchingSettings, string> = {
  baseScoreFull: 'base_score_full',
  baseScoreLanguageOnly: 'base_score_language_only',
  baseScoreGenderOnly: 'base_score_gender_only',
  distanceNoPenaltyKm: 'distance_no_penalty_km',
  distancePenaltyDivisor: 'distance_penalty_divisor',
  maxDistanceKm: 'max_distance_km',
  matchesPerSoldier: 'matches_per_soldier',
  minFinalScore: 'min_final_score',
  highScoreThreshold: 'high_score_threshold',
  mediumScoreThreshold: 'medium_score_threshold',
};

const SETTINGS_DESCRIPTIONS: Record<keyof MatchingSettings, string> = {
  baseScoreFull: 'ציון בסיס כשיש התאמת מגדר + שפה',
  baseScoreLanguageOnly: 'ציון בסיס כשיש התאמת שפה בלבד',
  baseScoreGenderOnly: 'ציון בסיס כשיש התאמת מגדר בלבד',
  distanceNoPenaltyKm: 'מרחק ללא הפחתה (ק"מ)',
  distancePenaltyDivisor: 'מחלק הפחתת מרחק (הפחתה = מרחק / מחלק)',
  maxDistanceKm: 'מרחק מקסימלי (ק"מ)',
  matchesPerSoldier: 'מספר התאמות לכל חייל',
  minFinalScore: 'ציון סופי מינימלי',
  highScoreThreshold: 'סף ציון גבוה',
  mediumScoreThreshold: 'סף ציון בינוני',
};

export async function loadSettings(): Promise<MatchingSettings> {
  const settings = { ...DEFAULT_SETTINGS };

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) {
      console.warn('[Settings] Failed to load from Supabase:', error.message);
      return settings;
    }

    if (data) {
      const dbValues = new Map(data.map(row => [row.key, row.value]));

      for (const [field, dbKey] of Object.entries(SETTINGS_KEY_MAP)) {
        const val = dbValues.get(dbKey);
        if (val !== undefined && val !== null) {
          settings[field as keyof MatchingSettings] = Number(val);
        }
      }
    }
  } catch (err) {
    console.warn('[Settings] Error loading settings:', err);
  }

  return settings;
}

export async function saveSettings(settings: MatchingSettings): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = Object.entries(SETTINGS_KEY_MAP).map(([field, dbKey]) => ({
      key: dbKey,
      value: String(settings[field as keyof MatchingSettings]),
      description: SETTINGS_DESCRIPTIONS[field as keyof MatchingSettings] || '',
    }));

    const { error } = await supabase
      .from('settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) {
      console.error('[Settings] Save failed:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}
