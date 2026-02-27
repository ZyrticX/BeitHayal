import * as XLSX from 'xlsx';
import type { Student, Soldier } from './supabase';

// Column mappings for Students file
const STUDENT_COLUMN_MAP: Record<string, keyof Student> = {
  'מין': 'gender',
  'רכז': 'coordinator',
  'עיר': 'city',
  'ארץ מוצא': 'origin_country',
  'שפות': 'languages',
  'תאריך התחלת התנדבות': 'volunteering_start_date',
  'שפת אם': 'mother_tongue',
  'כמות חיילים': 'current_soldiers_count',
  'הערות לסטטוס': 'status_notes',
  'שיכות לפרויקט': 'project_affiliation',
  'מזהה איש קשר': 'contact_id',
  'האם פעיל במלגה': 'is_scholarship_active',
  'עיר מגורים': 'residence_city',
  'סטטוס מתנדב/ת': 'volunteer_status',
};

// Column mappings for Soldiers file
const SOLDIER_COLUMN_MAP: Record<string, keyof Soldier> = {
  'מין': 'gender',
  'עיר מגורים': 'residence_city',
  'עיר': 'city',
  'ארץ מוצא': 'origin_country',
  'שפת אם': 'mother_tongue',
  'כיצד הגיע לעמותה': 'arrival_method',
  'הערות לסטטוס': 'status_notes',
  'בקשות מיוחדות בזמן בקשה לשיבוץ': 'special_requests',
  'שיכות לפרויקט': 'project_affiliation',
  'חיל': 'military_branch',
  'מקום שירות': 'service_location',
  'תאריך גיוס': 'enlistment_date',
  'תאריך שחרור': 'discharge_date',
  'תפקיד ביחידה': 'unit_role',
  'העדפת שפה': 'language_preference',
  'מתנדב או מתנדבת': 'volunteer_gender_preference',
  'שייך לסיירת': 'belongs_to_patrol',
  'האם מועדון חיילים': 'is_soldiers_club',
  'סוג איש קשר': 'contact_type',
  'רכז מחוז (של חייל)': 'district_coordinator',
  'עד כמה אני רוצה להשתתף באח גדול ?': 'participation_interest',
  'מזהה איש קשר': 'contact_id',
  'סטטוס חייל': 'soldier_status',
};

function parseExcelDate(value: unknown): string | null {
  if (!value) return null;
  
  if (typeof value === 'number') {
    // Excel serial date
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  
  if (typeof value === 'string') {
    // Try to parse string date (DD/MM/YYYY format common in Israel)
    const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
    }
    return value;
  }
  
  return null;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'TRUE' || value === 'true' || value === 1 || value === '1' || value === 'כן') return true;
  if (value === 'FALSE' || value === 'false' || value === 0 || value === '0' || value === 'לא') return false;
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

export interface ParseResult<T> {
  data: T[];
  errors: string[];
  warnings: string[];
}

export async function parseStudentsFile(file: File): Promise<ParseResult<Partial<Student>>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Partial<Student>[] = [];
  
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Find the right sheet
    const sheetName = workbook.SheetNames.find(name => 
      name.includes('סטטוס') || name.includes('מתנדב')
    ) || workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, unknown>;
      const student: Partial<Student> = {
        id: crypto.randomUUID(),
      };
      
      // Map columns
      for (const [hebrewCol, englishCol] of Object.entries(STUDENT_COLUMN_MAP)) {
        const value = row[hebrewCol];
        
        if (value !== null && value !== undefined && value !== '') {
          switch (englishCol) {
            case 'is_scholarship_active':
              (student as Record<string, unknown>)[englishCol] = parseBoolean(value);
              break;
            case 'current_soldiers_count':
              (student as Record<string, unknown>)[englishCol] = parseNumber(value);
              break;
            case 'volunteering_start_date':
              (student as Record<string, unknown>)[englishCol] = parseExcelDate(value);
              break;
            default:
              (student as Record<string, unknown>)[englishCol] = String(value).trim();
          }
        }
      }
      
      // Handle duplicate contact_id column
      if (!student.contact_id && row['מזהה איש קשר.1']) {
        student.contact_id = String(row['מזהה איש קשר.1']).trim();
      }
      
      // Validate required fields
      if (!student.contact_id) {
        errors.push(`שורה ${i + 2}: חסר מזהה איש קשר`);
        continue;
      }
      
      // Calculate derived fields
      const isScholarship = student.is_scholarship_active || false;
      const currentCount = student.current_soldiers_count || 0;
      student.max_soldiers = isScholarship ? 2 : 4;
      student.available_slots = Math.max((isScholarship ? 2 : 4) - currentCount, 0);
      
      data.push(student);
    }
    
    if (data.length === 0) {
      errors.push('לא נמצאו נתונים תקינים בקובץ');
    }
    
  } catch (err) {
    errors.push(`שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
  }
  
  return { data, errors, warnings };
}

export async function parseSoldiersFile(file: File): Promise<ParseResult<Partial<Soldier>>> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Partial<Soldier>[] = [];
  
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // Find the right sheet
    const sheetName = workbook.SheetNames.find(name => 
      name.includes('חייל') || name.includes('סטטוס')
    ) || workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
    
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as Record<string, unknown>;
      const soldier: Partial<Soldier> = {
        id: crypto.randomUUID(),
      };
      
      // Map columns
      for (const [hebrewCol, englishCol] of Object.entries(SOLDIER_COLUMN_MAP)) {
        const value = row[hebrewCol];
        
        if (value !== null && value !== undefined && value !== '') {
          switch (englishCol) {
            case 'belongs_to_patrol':
            case 'is_soldiers_club':
              (soldier as Record<string, unknown>)[englishCol] = parseBoolean(value);
              break;
            case 'participation_interest':
              (soldier as Record<string, unknown>)[englishCol] = parseNumber(value);
              break;
            case 'enlistment_date':
            case 'discharge_date':
              (soldier as Record<string, unknown>)[englishCol] = parseExcelDate(value);
              break;
            default:
              (soldier as Record<string, unknown>)[englishCol] = String(value).trim();
          }
        }
      }
      
      // Validate required fields
      if (!soldier.contact_id) {
        errors.push(`שורה ${i + 2}: חסר מזהה איש קשר`);
        continue;
      }
      
      data.push(soldier);
    }
    
    if (data.length === 0) {
      errors.push('לא נמצאו נתונים תקינים בקובץ');
    }
    
  } catch (err) {
    errors.push(`שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`);
  }
  
  return { data, errors, warnings };
}

// Export matches to Excel
export function exportMatchesToExcel(matches: Array<{
  student_contact_id: string;
  student_name?: string;
  student_city?: string;
  student_language?: string;
  soldier_contact_id: string;
  soldier_city?: string;
  soldier_language?: string;
  confidence_score: number;
  match_rank: number;
  reasons: string;
}>): Blob {
  const worksheet = XLSX.utils.json_to_sheet(matches.map(m => ({
    'מזהה סטודנט': m.student_contact_id,
    'עיר סטודנט': m.student_city || '',
    'שפת אם סטודנט': m.student_language || '',
    'מזהה חייל': m.soldier_contact_id,
    'עיר חייל': m.soldier_city || '',
    'שפת אם חייל': m.soldier_language || '',
    'ציון התאמה': m.confidence_score,
    'דירוג (1=ראשי, 2=חלופי)': m.match_rank,
    'סיבות': m.reasons,
  })));
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'התאמות');
  
  // Set RTL and column widths
  worksheet['!cols'] = [
    { wch: 18 }, // מזהה סטודנט
    { wch: 15 }, // עיר סטודנט
    { wch: 12 }, // שפת אם סטודנט
    { wch: 18 }, // מזהה חייל
    { wch: 15 }, // עיר חייל
    { wch: 12 }, // שפת אם חייל
    { wch: 12 }, // ציון
    { wch: 18 }, // דירוג
    { wch: 50 }, // סיבות
  ];
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
