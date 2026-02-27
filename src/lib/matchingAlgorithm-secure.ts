import type { LocalStudent, LocalSoldier, SecureMatch, MatchCriteria, EnrichedMatch } from './supabase-secure';
import { getDistanceScore } from './cityDistance';

// ===========================================
// Secure Matching Algorithm
// Works with codes only - no PII in matching logic!
//
// Scoring Table:
// ┌──────────┬──────┬───────┬─────────────────────────────────┐
// │ מגדר     │ שפה  │ פנוי  │ ציון סופי                       │
// ├──────────┼──────┼───────┼─────────────────────────────────┤
// │ ✅       │ ✅   │ ✅    │ אחוז מרחק (למשל 88%)           │
// │ ❌       │ ✅   │ ✅    │ 70 - (100 - מרחק)               │
// │ ✅       │ ❌   │ ✅    │ 60 - (100 - מרחק)               │
// │ ❌       │ ❌   │ ✅    │ אין מאץ'                        │
// │ כלשהו   │ כלשהו│ ❌    │ אין מאץ'                        │
// └──────────┴──────┴───────┴─────────────────────────────────┘
// עדיפות: מתנדב עם פחות חיילים
// ===========================================

interface MatchCandidate {
  student: LocalStudent;
  soldier: LocalSoldier;
  score: number;
  criteria: MatchCriteria;
}

// Language matching using codes
function checkLanguageMatch(
  studentLangCode: string | undefined,
  soldierLangCode: string | undefined
): boolean {
  if (!studentLangCode || !soldierLangCode) {
    return false;
  }

  // Exact code match
  if (studentLangCode === soldierLangCode) {
    return true;
  }

  // Related language families (codes)
  const languageFamilies: Record<string, string[]> = {
    'slavic': ['RU', 'UK', 'BG', 'HR', 'PL'],
    'romance': ['FR', 'ES', 'IT', 'PT', 'RO'],
    'semitic': ['HE', 'AR'],
    'germanic': ['DE', 'NL', 'DA'],
  };

  for (const [, codes] of Object.entries(languageFamilies)) {
    if (codes.includes(studentLangCode) && codes.includes(soldierLangCode)) {
      return true;
    }
  }

  return false;
}

// Gender preference matching
function checkGenderMatch(
  studentGender: string | null,
  soldierPref: string | null
): boolean {
  // No preference or "לא חשוב" = always matches
  if (!soldierPref || soldierPref === 'לא חשוב' || soldierPref === 'any') {
    return true;
  }

  if (!studentGender) {
    return false;
  }

  // Convert to comparable codes
  const genderCode = studentGender === 'זכר' ? 'M' : studentGender === 'נקבה' ? 'F' : studentGender;
  const prefCode = soldierPref === 'male' || soldierPref === 'מתנדב' ? 'M' :
                   soldierPref === 'female' || soldierPref === 'מתנדבת' ? 'F' : null;

  return genderCode === prefCode;
}

// Calculate match between student and soldier
export function calculateSecureMatch(
  student: LocalStudent,
  soldier: LocalSoldier
): MatchCandidate | null {

  // === Check gender and language ===
  const genderMatch = checkGenderMatch(student.gender, soldier.volunteer_gender_preference);
  const languageMatch = checkLanguageMatch(student.mother_tongue_code, soldier.mother_tongue_code);

  // === Calculate distance score (0-100) ===
  const distanceScore = getDistanceScore(student.city || '', soldier.city || '');

  // === Calculate final score based on the table ===
  let finalScore: number;

  if (genderMatch && languageMatch) {
    // ✅ מגדר + ✅ שפה → ציון = אחוז מרחק
    finalScore = distanceScore;
  } else if (!genderMatch && languageMatch) {
    // ❌ מגדר + ✅ שפה → ציון = 70 - (100 - מרחק)
    finalScore = 70 - (100 - distanceScore);
  } else if (genderMatch && !languageMatch) {
    // ✅ מגדר + ❌ שפה → ציון = 60 - (100 - מרחק)
    finalScore = 60 - (100 - distanceScore);
  } else {
    // ❌ מגדר + ❌ שפה → low score but still a candidate
    finalScore = 30 - (100 - distanceScore);
  }

  // Ensure score is at least 1 (everyone should get at least one match)
  finalScore = Math.max(1, Math.round(finalScore));

  const criteria: MatchCriteria = {
    language_match: languageMatch,
    distance_score: distanceScore,
    gender_pref_match: genderMatch,
    region_match: student.region === soldier.region,
  };

  return {
    student,
    soldier,
    score: finalScore,
    criteria,
  };
}

// Find all matches
export function findAllSecureMatches(
  students: LocalStudent[],
  soldiers: LocalSoldier[]
): Map<string, MatchCandidate[]> {
  const matchesBySoldier = new Map<string, MatchCandidate[]>();

  for (const soldier of soldiers) {
    const candidates: MatchCandidate[] = [];

    for (const student of students) {
      const match = calculateSecureMatch(student, soldier);
      if (match && match.score > 0) {
        candidates.push(match);
      }
    }

    // Sort by score descending, then by fewer soldiers (priority)
    candidates.sort((a, b) => {
      // Primary: higher score first
      if (b.score !== a.score) return b.score - a.score;
      // Secondary: fewer current soldiers = higher priority
      return a.student.current_soldiers_count - b.student.current_soldiers_count;
    });

    // Keep top 10 candidates to ensure enough options for 2 matches
    matchesBySoldier.set(soldier.contact_id, candidates.slice(0, 10));
  }

  return matchesBySoldier;
}

// Optimize matches - ensure every soldier gets exactly 2 matches
export function optimizeSecureMatches(
  matchesBySoldier: Map<string, MatchCandidate[]>,
  students: LocalStudent[]
): EnrichedMatch[] {
  const result: EnrichedMatch[] = [];
  const studentAssignments = new Map<string, number>();

  // Initialize student capacities
  for (const student of students) {
    studentAssignments.set(student.contact_id, student.current_soldiers_count);
  }

  // Process soldiers sorted by least options (hardest to match first)
  const soldiersWithOptions = Array.from(matchesBySoldier.entries())
    .map(([soldierId, candidates]) => ({ soldierId, candidates }))
    .sort((a, b) => a.candidates.length - b.candidates.length);

  for (const { candidates } of soldiersWithOptions) {
    if (candidates.length === 0) continue;

    const assignedForSoldier: EnrichedMatch[] = [];

    // First pass: try to assign respecting student capacity
    for (const candidate of candidates) {
      if (assignedForSoldier.length >= 2) break;

      const studentId = candidate.student.contact_id;
      const currentCount = studentAssignments.get(studentId) || 0;
      const maxCount = candidate.student.is_scholarship_active ? 2 : 4;

      // Skip if this student is already assigned to this soldier
      if (assignedForSoldier.some(m => m.student_external_id === studentId)) continue;

      if (currentCount < maxCount) {
        const rank = assignedForSoldier.length + 1;
        const match: EnrichedMatch = {
          id: crypto.randomUUID(),
          student_external_id: candidate.student.contact_id,
          soldier_external_id: candidate.soldier.contact_id,
          confidence_score: candidate.score,
          match_rank: rank,
          match_criteria: candidate.criteria,
          status: 'suggested',
          student: candidate.student,
          soldier: candidate.soldier,
        };

        assignedForSoldier.push(match);

        // Update assignment count only for rank 1
        if (rank === 1) {
          studentAssignments.set(studentId, currentCount + 1);
        }
      }
    }

    // Second pass: force-assign if we don't have 2 matches yet (ignore capacity)
    if (assignedForSoldier.length < 2) {
      for (const candidate of candidates) {
        if (assignedForSoldier.length >= 2) break;

        const studentId = candidate.student.contact_id;
        // Skip if this student is already assigned to this soldier
        if (assignedForSoldier.some(m => m.student_external_id === studentId)) continue;

        const rank = assignedForSoldier.length + 1;
        const match: EnrichedMatch = {
          id: crypto.randomUUID(),
          student_external_id: candidate.student.contact_id,
          soldier_external_id: candidate.soldier.contact_id,
          confidence_score: candidate.score,
          match_rank: rank,
          match_criteria: candidate.criteria,
          status: 'suggested',
          student: candidate.student,
          soldier: candidate.soldier,
        };

        assignedForSoldier.push(match);

        if (rank === 1) {
          const currentCount = studentAssignments.get(studentId) || 0;
          studentAssignments.set(studentId, currentCount + 1);
        }
      }
    }

    result.push(...assignedForSoldier);
  }

  return result;
}

// Summary returned after matching
export interface MatchingSummary {
  totalStudents: number;
  totalSoldiers: number;
  totalMatches: number;
  soldiersWithTwoMatches: number;
  soldiersWithOneMatch: number;
  soldiersWithNoMatch: number;
  studentsUsed: number;
  studentsNotUsed: number;
  avgScore: number;
  highScoreMatches: number;  // score >= 70
  mediumScoreMatches: number; // score 30-69
  lowScoreMatches: number;   // score < 30
}

// Main function to run secure matching
export function runSecureMatchingAlgorithm(
  students: LocalStudent[],
  soldiers: LocalSoldier[]
): { matches: EnrichedMatch[]; summary: MatchingSummary } {
  const availableStudents = students;
  const awaitingSoldiers = soldiers;

  console.log(`[Secure Matching] ${availableStudents.length} students, ${awaitingSoldiers.length} soldiers`);

  // Find all possible matches
  const allMatches = findAllSecureMatches(availableStudents, awaitingSoldiers);

  // Optimize - ensure every soldier gets 2 matches
  const optimizedMatches = optimizeSecureMatches(allMatches, availableStudents);

  // Sort by confidence score
  optimizedMatches.sort((a, b) => b.confidence_score - a.confidence_score);

  // Build summary
  const matchesBySoldierId = new Map<string, number>();
  const usedStudentIds = new Set<string>();

  for (const m of optimizedMatches) {
    matchesBySoldierId.set(m.soldier_external_id, (matchesBySoldierId.get(m.soldier_external_id) || 0) + 1);
    usedStudentIds.add(m.student_external_id);
  }

  const soldiersWithTwo = Array.from(matchesBySoldierId.values()).filter(c => c >= 2).length;
  const soldiersWithOne = Array.from(matchesBySoldierId.values()).filter(c => c === 1).length;
  const soldiersWithNone = awaitingSoldiers.length - matchesBySoldierId.size;

  const totalScore = optimizedMatches.reduce((s, m) => s + m.confidence_score, 0);

  const summary: MatchingSummary = {
    totalStudents: availableStudents.length,
    totalSoldiers: awaitingSoldiers.length,
    totalMatches: optimizedMatches.length,
    soldiersWithTwoMatches: soldiersWithTwo,
    soldiersWithOneMatch: soldiersWithOne,
    soldiersWithNoMatch: soldiersWithNone,
    studentsUsed: usedStudentIds.size,
    studentsNotUsed: availableStudents.length - usedStudentIds.size,
    avgScore: optimizedMatches.length > 0 ? Math.round(totalScore / optimizedMatches.length) : 0,
    highScoreMatches: optimizedMatches.filter(m => m.confidence_score >= 70).length,
    mediumScoreMatches: optimizedMatches.filter(m => m.confidence_score >= 30 && m.confidence_score < 70).length,
    lowScoreMatches: optimizedMatches.filter(m => m.confidence_score < 30).length,
  };

  console.log(`[Secure Matching] Summary:`, summary);

  return { matches: optimizedMatches, summary };
}

// ===========================================
// Conversion functions for Supabase sync
// ===========================================

// Convert LocalStudent to SecureStudent for cloud upload (strips PII)
export function toSecureStudent(local: LocalStudent): {
  external_id: string;
  gender: string | null;
  city_code: string | null;
  region: string | null;
  mother_tongue_code: string | null;
  current_soldiers_count: number;
  is_scholarship_active: boolean;
  status: string;
} {
  return {
    external_id: local.contact_id,
    gender: local.gender === 'זכר' ? 'M' : local.gender === 'נקבה' ? 'F' : null,
    city_code: local.city_code || null,
    region: local.region || null,
    mother_tongue_code: local.mother_tongue_code || null,
    current_soldiers_count: local.current_soldiers_count,
    is_scholarship_active: local.is_scholarship_active,
    status: local.volunteer_status === 'ממתין לשיבוץ' ? 'waiting' : 'inactive',
  };
}

// Convert LocalSoldier to SecureSoldier for cloud upload (strips PII)
export function toSecureSoldier(local: LocalSoldier): {
  external_id: string;
  gender: string | null;
  city_code: string | null;
  region: string | null;
  mother_tongue_code: string | null;
  language_preference_code: string | null;
  volunteer_gender_preference: string | null;
  status: string;
  has_special_requests: boolean;
} {
  // Convert gender preference to code
  let genderPref: string | null = null;
  if (local.volunteer_gender_preference) {
    if (local.volunteer_gender_preference === 'מתנדב') genderPref = 'male';
    else if (local.volunteer_gender_preference === 'מתנדבת') genderPref = 'female';
    else if (local.volunteer_gender_preference === 'לא חשוב') genderPref = 'any';
    else genderPref = local.volunteer_gender_preference;
  }

  return {
    external_id: local.contact_id,
    gender: local.gender === 'זכר' ? 'M' : local.gender === 'נקבה' ? 'F' : null,
    city_code: local.city_code || null,
    region: local.region || null,
    mother_tongue_code: local.mother_tongue_code || null,
    language_preference_code: local.mother_tongue_code || null,
    volunteer_gender_preference: genderPref,
    status: local.soldier_status === 'מחכה לשיבוץ' ? 'waiting' : 'inactive',
    has_special_requests: local.has_special_requests,
  };
}

// Convert EnrichedMatch to SecureMatch for cloud upload
export function toSecureMatch(enriched: EnrichedMatch): Omit<SecureMatch, 'id' | 'created_at' | 'updated_at'> {
  return {
    student_id: '',
    soldier_id: '',
    confidence_score: enriched.confidence_score,
    match_rank: enriched.match_rank,
    match_criteria: enriched.match_criteria,
    status: enriched.status,
  };
}
