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

// Find all matches - keep ALL candidates so every student has a chance
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

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    matchesBySoldier.set(soldier.contact_id, candidates);
  }

  return matchesBySoldier;
}

// Optimize matches - ensure every soldier gets exactly 2 matches
// and distribute students as evenly as possible
export function optimizeSecureMatches(
  matchesBySoldier: Map<string, MatchCandidate[]>,
  students: LocalStudent[]
): EnrichedMatch[] {
  const result: EnrichedMatch[] = [];
  const studentAssignments = new Map<string, number>();

  // Initialize student assignment counts
  for (const student of students) {
    studentAssignments.set(student.contact_id, 0);
  }

  // Process soldiers sorted by least options (hardest to match first)
  const soldiersWithOptions = Array.from(matchesBySoldier.entries())
    .map(([soldierId, candidates]) => ({ soldierId, candidates }))
    .sort((a, b) => a.candidates.length - b.candidates.length);

  for (const { candidates } of soldiersWithOptions) {
    if (candidates.length === 0) continue;

    const assignedForSoldier: EnrichedMatch[] = [];

    // Re-sort candidates: prefer less-assigned students (spread the load)
    // Among students with same assignment count, prefer higher score
    const sortedCandidates = [...candidates].sort((a, b) => {
      const aAssigned = studentAssignments.get(a.student.contact_id) || 0;
      const bAssigned = studentAssignments.get(b.student.contact_id) || 0;
      // Primary: prefer students with fewer assignments
      if (aAssigned !== bAssigned) return aAssigned - bAssigned;
      // Secondary: prefer higher score
      return b.score - a.score;
    });

    // Assign 2 matches from the balanced list
    for (const candidate of sortedCandidates) {
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

      // Update assignment count for rank 1 (primary)
      if (rank === 1) {
        studentAssignments.set(studentId, (studentAssignments.get(studentId) || 0) + 1);
      }
    }

    result.push(...assignedForSoldier);
  }

  // Final pass: swap in unused students to maximize coverage
  // Find students that were never assigned
  const usedStudentIds = new Set(result.map(m => m.student_external_id));
  const unusedStudents = students.filter(s => !usedStudentIds.has(s.contact_id));

  if (unusedStudents.length > 0) {
    console.log(`[Secure Matching] Final pass: trying to place ${unusedStudents.length} unused students`);

    // For each unused student, find the rank-2 match with the most-overloaded
    // student and swap if possible
    for (const unusedStudent of unusedStudents) {
      // Find rank-2 matches where the assigned student has the most assignments
      let bestSwapIdx = -1;
      let bestOverload = 0;

      for (let i = 0; i < result.length; i++) {
        const match = result[i];
        if (match.match_rank !== 2) continue;

        const assignedStudentId = match.student_external_id;
        const assignedCount = studentAssignments.get(assignedStudentId) || 0;

        // Only swap if the current student is overloaded (assigned > 1)
        if (assignedCount > bestOverload) {
          bestOverload = assignedCount;
          bestSwapIdx = i;
        }
      }

      if (bestSwapIdx >= 0 && bestOverload > 1) {
        const oldMatch = result[bestSwapIdx];
        const soldier = oldMatch.soldier!;

        // Calculate score for the unused student with this soldier
        const newCandidate = calculateSecureMatch(unusedStudent, {
          contact_id: oldMatch.soldier_external_id,
          gender: soldier.gender,
          city: soldier.city,
          city_code: soldier.city_code,
          region: soldier.region,
          origin_country: soldier.origin_country,
          mother_tongue: soldier.mother_tongue,
          mother_tongue_code: soldier.mother_tongue_code,
          language_preference: soldier.language_preference,
          volunteer_gender_preference: soldier.volunteer_gender_preference,
          soldier_status: soldier.soldier_status,
          has_special_requests: soldier.has_special_requests,
        });

        if (newCandidate) {
          // Swap: replace the rank-2 match with the unused student
          result[bestSwapIdx] = {
            id: crypto.randomUUID(),
            student_external_id: unusedStudent.contact_id,
            soldier_external_id: oldMatch.soldier_external_id,
            confidence_score: newCandidate.score,
            match_rank: 2,
            match_criteria: newCandidate.criteria,
            status: 'suggested',
            student: unusedStudent,
            soldier: soldier,
          };

          // Update assignment tracking
          studentAssignments.set(unusedStudent.contact_id, (studentAssignments.get(unusedStudent.contact_id) || 0) + 1);
        }
      }
    }
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
