import type { Student, Soldier, Match, MatchReasons } from './supabase';
import { getCityDistance, getDistanceScore } from './cityDistance';

// Matching weights (total should be 100)
const WEIGHTS = {
  LANGUAGE: 35,      // שפת אם - highest priority
  DISTANCE: 25,      // מרחק בין ערים
  GENDER_PREF: 15,   // העדפת מתנדב/מתנדבת
  SPECIAL_REQ: 15,   // בקשות מיוחדות
  AVAILABILITY: 10,  // זמינות (מקומות פנויים)
};

interface MatchCandidate {
  student: Student;
  soldier: Soldier;
  score: number;
  reasons: MatchReasons;
}

// Language matching
function getLanguageScore(studentLanguage: string | null, soldierLanguage: string | null): { score: number; match: boolean } {
  if (!studentLanguage || !soldierLanguage) {
    return { score: 0, match: false };
  }
  
  const studentLang = studentLanguage.toLowerCase().trim();
  const soldierLang = soldierLanguage.toLowerCase().trim();
  
  // Exact match
  if (studentLang === soldierLang) {
    return { score: 100, match: true };
  }
  
  // Common language variations
  const languageFamilies: Record<string, string[]> = {
    'עברית': ['עברית', 'hebrew', 'ivrit'],
    'אנגלית': ['אנגלית', 'english'],
    'רוסית': ['רוסית', 'russian', 'русский'],
    'אוקראינית': ['אוקראינית', 'ukrainian', 'українська'],
    'צרפתית': ['צרפתית', 'french', 'français'],
    'ספרדית': ['ספרדית', 'spanish', 'español'],
    'ערבית': ['ערבית', 'arabic', 'عربي'],
    'אמהרית': ['אמהרית', 'amharic'],
    'פרסית': ['פרסית', 'persian', 'farsi'],
  };
  
  for (const [, variants] of Object.entries(languageFamilies)) {
    const studentMatch = variants.some(v => studentLang.includes(v) || v.includes(studentLang));
    const soldierMatch = variants.some(v => soldierLang.includes(v) || v.includes(soldierLang));
    
    if (studentMatch && soldierMatch) {
      return { score: 100, match: true };
    }
  }
  
  return { score: 0, match: false };
}

// Gender preference matching
function getGenderPreferenceScore(
  studentGender: string | null,
  soldierPreference: string | null
): { score: number; match: boolean } {
  if (!soldierPreference || soldierPreference === 'לא חשוב') {
    return { score: 100, match: true };
  }
  
  if (!studentGender) {
    return { score: 50, match: false };
  }
  
  const genderMap: Record<string, string> = {
    'זכר': 'מתנדב',
    'נקבה': 'מתנדבת',
  };
  
  const expectedPreference = genderMap[studentGender];
  
  if (soldierPreference === expectedPreference) {
    return { score: 100, match: true };
  }
  
  return { score: 0, match: false };
}

// Check special requests
function checkSpecialRequests(
  student: Student,
  soldier: Soldier
): { score: number; considered: boolean; details: string[] } {
  const details: string[] = [];
  let score = 100; // Start with full score
  
  const specialRequests = soldier.special_requests?.toLowerCase() || '';
  
  if (!specialRequests || specialRequests.trim() === '') {
    return { score: 100, considered: false, details: ['אין בקשות מיוחדות'] };
  }
  
  // Check for gender-specific requests
  if (specialRequests.includes('מתנדבת') && student.gender !== 'נקבה') {
    score -= 30;
    details.push('ביקש/ה מתנדבת אך המתנדב זכר');
  }
  if (specialRequests.includes('מתנדב') && !specialRequests.includes('מתנדבת') && student.gender !== 'זכר') {
    score -= 30;
    details.push('ביקש/ה מתנדב אך המתנדבת נקבה');
  }
  
  // Check for language-specific requests
  if (specialRequests.includes('אנגלית') && student.mother_tongue !== 'אנגלית') {
    score -= 20;
    details.push('ביקש/ה דובר/ת אנגלית');
  }
  
  if (details.length === 0) {
    details.push('בקשות מיוחדות נבדקו');
  }
  
  return { score: Math.max(0, score), considered: true, details };
}

// Availability score
function getAvailabilityScore(student: Student): number {
  if (student.available_slots <= 0) return 0;
  if (student.available_slots >= 3) return 100;
  if (student.available_slots >= 2) return 80;
  return 60;
}

// Calculate match between a student and soldier
export function calculateMatch(student: Student, soldier: Soldier): MatchCandidate | null {
  const details: string[] = [];
  
  // 1. Language check (MUST match unless distance is very close)
  const languageResult = getLanguageScore(student.mother_tongue, soldier.mother_tongue);
  
  // 2. Distance check
  const studentCity = student.city || student.residence_city;
  const soldierCity = soldier.city || soldier.residence_city;
  const distance = getCityDistance(studentCity || '', soldierCity || '');
  const distanceScore = getDistanceScore(studentCity || '', soldierCity || '');
  
  // If language doesn't match AND distance > 50km, reject
  if (!languageResult.match) {
    if (distance === null || distance > 50) {
      return null; // Reject - language mismatch and too far
    }
    details.push('שפה לא תואמת אך מרחק קרוב');
  } else {
    details.push(`שפה תואמת: ${student.mother_tongue}`);
  }
  
  // If distance > 150km, reject regardless
  if (distance !== null && distance > 150) {
    return null;
  }
  
  if (distance !== null) {
    details.push(`מרחק: ${distance.toFixed(1)} ק"מ`);
  }
  
  // 3. Check availability
  if (student.available_slots <= 0) {
    return null; // No available slots
  }
  
  // 4. Gender preference
  const genderResult = getGenderPreferenceScore(student.gender, soldier.volunteer_gender_preference);
  if (genderResult.match) {
    if (soldier.volunteer_gender_preference && soldier.volunteer_gender_preference !== 'לא חשוב') {
      details.push(`העדפת מגדר תואמת: ${soldier.volunteer_gender_preference}`);
    }
  } else if (soldier.volunteer_gender_preference && soldier.volunteer_gender_preference !== 'לא חשוב') {
    details.push(`העדפת מגדר לא תואמת: רצה ${soldier.volunteer_gender_preference}`);
  }
  
  // 5. Special requests
  const specialResult = checkSpecialRequests(student, soldier);
  details.push(...specialResult.details);
  
  // Calculate weighted score
  const languageScore = languageResult.score * (WEIGHTS.LANGUAGE / 100);
  const distScore = distanceScore * (WEIGHTS.DISTANCE / 100);
  const genderScore = genderResult.score * (WEIGHTS.GENDER_PREF / 100);
  const specialScore = specialResult.score * (WEIGHTS.SPECIAL_REQ / 100);
  const availScore = getAvailabilityScore(student) * (WEIGHTS.AVAILABILITY / 100);
  
  const totalScore = Math.round(languageScore + distScore + genderScore + specialScore + availScore);
  
  const reasons: MatchReasons = {
    language_match: languageResult.match,
    language_score: languageResult.score,
    city_match: distanceScore >= 80,
    distance_km: distance,
    gender_preference_match: genderResult.match,
    special_requests_considered: specialResult.considered,
    details,
  };
  
  return {
    student,
    soldier,
    score: totalScore,
    reasons,
  };
}

// Find best matches for all soldiers
export function findAllMatches(
  students: Student[],
  soldiers: Soldier[]
): Map<string, MatchCandidate[]> {
  const matchesBySoldier = new Map<string, MatchCandidate[]>();
  
  for (const soldier of soldiers) {
    const candidates: MatchCandidate[] = [];
    
    for (const student of students) {
      const match = calculateMatch(student, soldier);
      if (match && match.score > 0) {
        candidates.push(match);
      }
    }
    
    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);
    
    // Keep top 5 candidates
    matchesBySoldier.set(soldier.contact_id, candidates.slice(0, 5));
  }
  
  return matchesBySoldier;
}

// Optimize matches to avoid conflicts (one student shouldn't be matched to too many soldiers)
export function optimizeMatches(
  matchesBySoldier: Map<string, MatchCandidate[]>,
  students: Student[]
): Match[] {
  const result: Match[] = [];
  const studentAssignments = new Map<string, number>(); // Track how many soldiers assigned to each student
  
  // Initialize student capacities
  for (const student of students) {
    studentAssignments.set(student.contact_id, student.current_soldiers_count);
  }
  
  // Process soldiers sorted by least options (hardest to match first)
  const soldiersWithOptions = Array.from(matchesBySoldier.entries())
    .map(([soldierId, candidates]) => ({ soldierId, candidates }))
    .sort((a, b) => a.candidates.length - b.candidates.length);
  
  for (const { candidates } of soldiersWithOptions) {
    let rank = 1;
    
    for (const candidate of candidates) {
      const studentId = candidate.student.contact_id;
      const currentCount = studentAssignments.get(studentId) || 0;
      const maxCount = candidate.student.is_scholarship_active ? 2 : 4;
      
      if (currentCount < maxCount) {
        // Create match record
        const match: Match = {
          id: crypto.randomUUID(),
          student_id: candidate.student.id,
          soldier_id: candidate.soldier.id,
          confidence_score: candidate.score,
          match_rank: rank,
          match_reasons: candidate.reasons,
          status: 'suggested',
          created_by: null,
          approved_by: null,
          approved_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          student: candidate.student,
          soldier: candidate.soldier,
        };
        
        result.push(match);
        
        // Update assignment count only for rank 1 (primary match)
        if (rank === 1) {
          studentAssignments.set(studentId, currentCount + 1);
        }
        
        rank++;
        
        // Keep max 2 options per soldier
        if (rank > 2) break;
      }
    }
  }
  
  return result;
}

// Main function to run matching algorithm
export function runMatchingAlgorithm(
  students: Student[],
  soldiers: Soldier[]
): Match[] {
  // Filter only available students and soldiers awaiting placement
  const availableStudents = students.filter(s => 
    s.volunteer_status === 'ממתין לשיבוץ' && 
    s.available_slots > 0
  );
  
  const awaitingSoldiers = soldiers.filter(s => 
    s.soldier_status === 'מחכה לשיבוץ' || s.soldier_status === 'ממתין לשיחה'
  );
  
  console.log(`Running matching: ${availableStudents.length} students, ${awaitingSoldiers.length} soldiers`);
  
  // Find all possible matches
  const allMatches = findAllMatches(availableStudents, awaitingSoldiers);
  
  // Optimize to avoid over-assignment
  const optimizedMatches = optimizeMatches(allMatches, availableStudents);
  
  // Sort by confidence score
  optimizedMatches.sort((a, b) => b.confidence_score - a.confidence_score);
  
  return optimizedMatches;
}
