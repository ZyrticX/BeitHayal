import * as XLSX from 'xlsx';
import type { LocalStudent, LocalSoldier } from './supabase-secure';
import { getLanguageCode, getCityInfo } from './supabase-secure';
import { resolveUnknownCities } from './cityDistance';
import { isGeocodingAvailable } from './geocodingService';

// ===========================================
// Secure Excel Parser
// Separates PII (stays local) from matching data (can go to cloud)
// ===========================================

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'TRUE' || value === 'true' || value === 1 || value === '1' || value === 'כן') return true;
  return false;
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

// ===========================================
// Parse Students - keeps all data locally, adds codes for cloud
// ===========================================
export async function parseStudentsFile(file: File): Promise<ParseResult<LocalStudent>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: LocalStudent[] = [];
  const unresolvedCities: { index: number; city: string }[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const sheetName = workbook.SheetNames.find(name =>
      name.includes('סטטוס') || name.includes('מתנדב')
    ) || workbook.SheetNames[0];

    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, unknown>;
      
      // Get contact ID
      const rawContactId = row['מזהה איש קשר'] || row['מזהה איש קשר.1'];
      if (!rawContactId) {
        errors.push(`שורה ${i + 2}: חסר מזהה איש קשר`);
        continue;
      }
      const contactId: string = String(rawContactId).trim();
      
      // Parse city and get code
      const city = (row['עיר'] || row['עיר מגורים']) as string | null;
      const cityInfo = getCityInfo(city?.trim() || null);
      
      // Parse language and get code
      const motherTongue = row['שפת אם'] as string | null;
      const langCode = getLanguageCode(motherTongue?.trim() || null);
      
      // Parse gender
      const gender = row['מין'] as string | null;
      
      // Parse scholarship and counts
      const isScholarship = parseBoolean(row['האם פעיל במלגה']);
      const currentCount = parseNumber(row['כמות חיילים']);
      const maxSoldiers = isScholarship ? 2 : 4;
      const availableSlots = Math.max(maxSoldiers - currentCount, 0);
      
      // Get full name (PII - stays local!)
      const firstName = row['שם פרטי'] as string || '';
      const lastName = row['שם משפחה'] as string || '';
      const fullName = row['שם מלא'] as string || 
                       (firstName && lastName ? `${firstName} ${lastName}`.trim() : 
                        firstName || lastName || undefined);
      
      const student: LocalStudent = {
        // PII - stays local only!
        contact_id: contactId,
        full_name: fullName?.trim() || undefined,
        phone: (row['טלפון'] || row['טלפון נייד'] || row['נייד']) as string || undefined,
        email: (row['דוא"ל'] || row['אימייל'] || row['מייל']) as string || undefined,
        coordinator: (row['רכז'] || row['רכז מחוז']) as string || undefined,
        notes: row['הערות לסטטוס'] as string || undefined,
        
        // Matching data
        gender: gender?.trim() || null,
        city: city?.trim() || null,
        city_code: cityInfo?.code,
        region: cityInfo?.region,
        origin_country: (row['ארץ מוצא'] as string)?.trim() || null,
        languages: (row['שפות'] as string)?.trim() || null,
        mother_tongue: motherTongue?.trim() || null,
        mother_tongue_code: langCode || undefined,
        current_soldiers_count: currentCount,
        is_scholarship_active: isScholarship,
        max_soldiers: maxSoldiers,
        available_slots: availableSlots,
        volunteer_status: (row['סטטוס מתנדב/ת'] as string)?.trim() || null,
      };
      
      data.push(student);

      // Track unresolved cities for Google Maps API fallback
      if (city && !cityInfo) {
        unresolvedCities.push({ index: data.length - 1, city: city.trim() });
      }

      // Warn if language not in mapping
      if (motherTongue && !langCode) {
        warnings.push(`שורה ${i + 2}: שפה "${motherTongue}" לא נמצאה במיפוי`);
      }
    }

    // Try to resolve unknown cities via Google Maps API
    if (unresolvedCities.length > 0 && isGeocodingAvailable()) {
      const uniqueCities = [...new Set(unresolvedCities.map(u => u.city))];
      console.log(`[Parser] Resolving ${uniqueCities.length} unknown cities via Google Maps API...`);

      const { resolved, failed } = await resolveUnknownCities(uniqueCities);

      if (resolved > 0) {
        console.log(`[Parser] Resolved ${resolved} cities via Google Maps API`);
        // Re-process the unresolved cities with new data
        for (const { index, city } of unresolvedCities) {
          const newCityInfo = getCityInfo(city);
          if (newCityInfo) {
            data[index].city_code = newCityInfo.code;
            data[index].region = newCityInfo.region;
          }
        }
      }

      // Only warn about cities that still failed
      for (const failedCity of failed) {
        const rows = unresolvedCities
          .filter(u => u.city === failedCity)
          .map(u => u.index + 2);
        warnings.push(`שורות ${rows.join(', ')}: עיר "${failedCity}" לא נמצאה במיפוי ולא ב-Google Maps - המרחק לא יחושב`);
      }
    } else if (unresolvedCities.length > 0) {
      // No Google Maps API - warn about all unresolved cities
      const uniqueCities = [...new Set(unresolvedCities.map(u => u.city))];
      for (const city of uniqueCities) {
        const rows = unresolvedCities
          .filter(u => u.city === city)
          .map(u => u.index + 2);
        warnings.push(`שורות ${rows.join(', ')}: עיר "${city}" לא נמצאה במיפוי - המרחק לא יחושב`);
      }
      if (!isGeocodingAvailable()) {
        warnings.push('💡 טיפ: הוסף VITE_GOOGLE_MAPS_API_KEY לקובץ .env כדי לזהות ערים אוטומטית דרך Google Maps');
      }
    }

    if (data.length === 0) {
      errors.push('לא נמצאו נתונים תקינים בקובץ');
    }

  } catch (err) {
    errors.push(`שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
  }

  return { data, errors, warnings };
}

// ===========================================
// Parse Soldiers - keeps all data locally, adds codes for cloud
// ===========================================
export async function parseSoldiersFile(file: File): Promise<ParseResult<LocalSoldier>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: LocalSoldier[] = [];
  const unresolvedCities: { index: number; city: string }[] = [];

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

    const sheetName = workbook.SheetNames.find(name =>
      name.includes('חייל') || name.includes('סטטוס')
    ) || workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, unknown>;
      
      // Get contact ID
      const contactId = row['מזהה איש קשר'];
      if (!contactId) {
        errors.push(`שורה ${i + 2}: חסר מזהה איש קשר`);
        continue;
      }
      
      // Parse city and get code
      const city = (row['עיר'] || row['עיר מגורים']) as string | null;
      const cityInfo = getCityInfo(city?.trim() || null);
      
      // Parse language and get code
      const motherTongue = row['שפת אם'] as string | null;
      const langCode = getLanguageCode(motherTongue?.trim() || null);
      
      // Parse special requests - flag only, text stays local
      const specialRequests = row['בקשות מיוחדות בזמן בקשה לשיבוץ'] as string | null;
      const hasSpecialRequests = !!(specialRequests && specialRequests.trim());
      
      // Parse volunteer preference
      const volunteerPref = row['מתנדב או מתנדבת'] as string | null;
      
      // Get full name (PII - stays local!)
      const firstName = row['שם פרטי'] as string || '';
      const lastName = row['שם משפחה'] as string || '';
      const fullName = row['שם מלא'] as string || 
                       (firstName && lastName ? `${firstName} ${lastName}`.trim() : 
                        firstName || lastName || undefined);
      
      const soldier: LocalSoldier = {
        // PII - stays local only!
        contact_id: String(contactId).trim(),
        full_name: fullName?.trim() || undefined,
        phone: (row['טלפון'] || row['טלפון נייד'] || row['נייד']) as string || undefined,
        email: (row['דוא"ל'] || row['אימייל'] || row['מייל']) as string || undefined,
        coordinator: (row['רכז מחוז (של חייל)'] || row['רכז מחוז'] || row['רכז']) as string || undefined,
        notes: row['הערות לסטטוס'] as string || undefined,
        special_requests: specialRequests?.trim() || undefined, // Stays local!
        
        // Matching data
        gender: (row['מין'] as string)?.trim() || null,
        city: city?.trim() || null,
        city_code: cityInfo?.code,
        region: cityInfo?.region,
        origin_country: (row['ארץ מוצא'] as string)?.trim() || null,
        mother_tongue: motherTongue?.trim() || null,
        mother_tongue_code: langCode || undefined,
        language_preference: (row['העדפת שפה'] as string)?.trim() || null,
        volunteer_gender_preference: volunteerPref?.trim() || null,
        soldier_status: (row['סטטוס חייל'] as string)?.trim() || null,
        has_special_requests: hasSpecialRequests,
      };
      
      data.push(soldier);

      // Track unresolved cities
      if (city && !cityInfo) {
        unresolvedCities.push({ index: data.length - 1, city: city.trim() });
      }
    }

    // Try to resolve unknown cities via Google Maps API
    if (unresolvedCities.length > 0 && isGeocodingAvailable()) {
      const uniqueCities = [...new Set(unresolvedCities.map(u => u.city))];
      console.log(`[Parser] Resolving ${uniqueCities.length} unknown soldier cities via Google Maps API...`);

      const { resolved, failed } = await resolveUnknownCities(uniqueCities);

      if (resolved > 0) {
        console.log(`[Parser] Resolved ${resolved} soldier cities via Google Maps API`);
        for (const { index, city } of unresolvedCities) {
          const newCityInfo = getCityInfo(city);
          if (newCityInfo) {
            data[index].city_code = newCityInfo.code;
            data[index].region = newCityInfo.region;
          }
        }
      }

      for (const failedCity of failed) {
        const rows = unresolvedCities
          .filter(u => u.city === failedCity)
          .map(u => u.index + 2);
        warnings.push(`שורות ${rows.join(', ')}: עיר "${failedCity}" לא נמצאה במיפוי ולא ב-Google Maps - המרחק לא יחושב`);
      }
    } else if (unresolvedCities.length > 0) {
      const uniqueCities = [...new Set(unresolvedCities.map(u => u.city))];
      for (const city of uniqueCities) {
        const rows = unresolvedCities
          .filter(u => u.city === city)
          .map(u => u.index + 2);
        warnings.push(`שורות ${rows.join(', ')}: עיר "${city}" לא נמצאה במיפוי - המרחק לא יחושב`);
      }
      if (!isGeocodingAvailable()) {
        warnings.push('💡 טיפ: הוסף VITE_GOOGLE_MAPS_API_KEY לקובץ .env כדי לזהות ערים אוטומטית דרך Google Maps');
      }
    }

    if (data.length === 0) {
      errors.push('לא נמצאו נתונים תקינים בקובץ');
    }

  } catch (err) {
    errors.push(`שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
  }

  return { data, errors, warnings };
}

// ===========================================
// Export matches - includes IDs only, user joins with local data
// ===========================================
export function exportMatchesToExcel(matches: Array<{
  student_external_id: string;
  soldier_external_id: string;
  confidence_score: number;
  match_rank: number;
  status: string;
}>): Blob {
  const worksheet = XLSX.utils.json_to_sheet(matches.map(m => ({
    'מזהה סטודנט': m.student_external_id,
    'מזהה חייל': m.soldier_external_id,
    'ציון התאמה': m.confidence_score,
    'דירוג': m.match_rank === 1 ? 'ראשי' : 'חלופי',
    'סטטוס': m.status === 'approved' ? 'אושר' : m.status === 'rejected' ? 'נדחה' : 'ממתין',
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'התאמות');
  
  worksheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
  ];
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
