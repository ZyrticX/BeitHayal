import React, { useState, useMemo } from 'react';
import { Play, Download, CheckCircle, XCircle, RefreshCw, Filter, ChevronDown, ChevronUp, Shield, Cloud } from 'lucide-react';
import type { LocalStudent, LocalSoldier, EnrichedMatch } from '../lib/supabase-secure';
import { runSecureMatchingAlgorithm } from '../lib/matchingAlgorithm-secure';
import type { MatchingSummary } from '../lib/matchingAlgorithm-secure';
import { exportMatchesToExcel } from '../lib/excelParser-secure';

interface MatchesPanelProps {
  students: LocalStudent[];
  soldiers: LocalSoldier[];
  matches: EnrichedMatch[];
  setMatches: (matches: EnrichedMatch[]) => void;
  setIsLoading: (loading: boolean) => void;
}

type SortField = 'confidence_score' | 'match_rank' | 'student_city' | 'soldier_city' | 'language';
type SortOrder = 'asc' | 'desc';

export default function MatchesPanel({
  students,
  soldiers,
  matches,
  setMatches,
  setIsLoading
}: MatchesPanelProps) {
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterRank, setFilterRank] = useState<string>('');
  const [minScore, setMinScore] = useState<number>(0);
  const [sortField, setSortField] = useState<SortField>('confidence_score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [matchingSummary, setMatchingSummary] = useState<MatchingSummary | null>(null);

  const runMatching = async () => {
    if (students.length === 0 || soldiers.length === 0) {
      alert('יש להעלות קבצי סטודנטים וחיילים לפני הרצת ההתאמה');
      return;
    }

    setIsLoading(true);

    try {
      // Small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      // Run SECURE matching algorithm (works with codes only)
      const { matches: newMatches, summary } = runSecureMatchingAlgorithm(students, soldiers);
      setMatches(newMatches);
      setMatchingSummary(summary);

      if (newMatches.length === 0) {
        alert('לא נמצאו התאמות אפשריות.');
      }
    } catch (err) {
      console.error('Matching error:', err);
      alert('אירעה שגיאה בהרצת ההתאמה');
    } finally {
      setIsLoading(false);
    }
  };

  const updateMatchStatus = (matchId: string, status: 'approved' | 'rejected') => {
    setMatches(matches.map(m => 
      m.id === matchId 
        ? { ...m, status }
        : m
    ));
  };

  const exportMatches = () => {
    // Export only IDs - no PII in export!
    const exportData = filteredMatches.map(m => ({
      student_external_id: m.student_external_id,
      soldier_external_id: m.soldier_external_id,
      confidence_score: m.confidence_score,
      match_rank: m.match_rank,
      status: m.status,
    }));

    const blob = exportMatchesToExcel(exportData);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `התאמות_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredMatches = useMemo(() => {
    let result = [...matches];

    // Status filter
    if (filterStatus) {
      result = result.filter(m => m.status === filterStatus);
    }

    // Rank filter
    if (filterRank) {
      result = result.filter(m => m.match_rank === parseInt(filterRank));
    }

    // Score filter
    if (minScore > 0) {
      result = result.filter(m => m.confidence_score >= minScore);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: number | string = 0;
      let bVal: number | string = 0;

      switch (sortField) {
        case 'confidence_score':
          aVal = a.confidence_score;
          bVal = b.confidence_score;
          break;
        case 'match_rank':
          aVal = a.match_rank;
          bVal = b.match_rank;
          break;
        case 'student_city':
          aVal = a.student?.city || '';
          bVal = b.student?.city || '';
          break;
        case 'soldier_city':
          aVal = a.soldier?.city || '';
          bVal = b.soldier?.city || '';
          break;
        case 'language':
          aVal = a.student?.mother_tongue || '';
          bVal = b.student?.mother_tongue || '';
          break;
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [matches, filterStatus, filterRank, minScore, sortField, sortOrder]);

  const stats = useMemo(() => ({
    total: matches.length,
    approved: matches.filter(m => m.status === 'approved').length,
    rejected: matches.filter(m => m.status === 'rejected').length,
    pending: matches.filter(m => m.status === 'suggested').length,
    primary: matches.filter(m => m.match_rank === 1).length,
    secondary: matches.filter(m => m.match_rank === 2).length,
    avgScore: matches.length > 0 
      ? Math.round(matches.reduce((sum, m) => sum + m.confidence_score, 0) / matches.length)
      : 0,
  }), [matches]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder(field === 'confidence_score' ? 'desc' : 'asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  // Get display name from local data (JOIN in browser memory)
  const getStudentDisplay = (match: EnrichedMatch) => {
    const student = match.student;
    if (!student) return match.student_external_id;
    return student.full_name || student.contact_id;
  };

  const getSoldierDisplay = (match: EnrichedMatch) => {
    const soldier = match.soldier;
    if (!soldier) return match.soldier_external_id;
    return soldier.full_name || soldier.contact_id;
  };

  return (
    <div className="matches-panel">
      <div className="matches-header">
        <div className="matches-title">
          <h2>התאמות ({filteredMatches.length})</h2>
          <p>הרץ אלגוריתם התאמה ונהל את התוצאות</p>
        </div>
        
        <div className="matches-actions">
          <button 
            className="btn btn-primary"
            onClick={runMatching}
            disabled={students.length === 0 || soldiers.length === 0}
          >
            <Play size={20} />
            הרץ התאמה
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={exportMatches}
            disabled={matches.length === 0}
          >
            <Download size={20} />
            ייצא לאקסל
          </button>

          {matches.length > 0 && (
            <button 
              className="btn btn-outline"
              onClick={() => { setMatches([]); setMatchingSummary(null); }}
            >
              <RefreshCw size={20} />
              נקה
            </button>
          )}
        </div>
      </div>

      {/* Security Notice */}
      {matches.length > 0 && (
        <div className="security-info-bar">
          <Shield size={16} />
          <span>ההתאמה מבוססת על קודים בלבד. המידע האישי (שמות, טלפונים) מוצג מהנתונים המקומיים.</span>
        </div>
      )}

      {matchingSummary && matches.length > 0 && (
        <div className="matching-summary">
          <h3>סיכום הרצה</h3>
          <div className="summary-grid">
            <div className="summary-section">
              <h4>נתוני קלט</h4>
              <p><strong>{matchingSummary.totalStudents}</strong> סטודנטים</p>
              <p><strong>{matchingSummary.totalSoldiers}</strong> חיילים</p>
            </div>
            <div className="summary-section">
              <h4>כיסוי חיילים</h4>
              <p className="summary-highlight success"><strong>{matchingSummary.soldiersWithTwoMatches}</strong> חיילים עם 2 התאמות</p>
              {matchingSummary.soldiersWithOneMatch > 0 && (
                <p className="summary-highlight warning"><strong>{matchingSummary.soldiersWithOneMatch}</strong> חיילים עם התאמה אחת</p>
              )}
              {matchingSummary.soldiersWithNoMatch > 0 && (
                <p className="summary-highlight danger"><strong>{matchingSummary.soldiersWithNoMatch}</strong> חיילים ללא התאמה</p>
              )}
            </div>
            <div className="summary-section">
              <h4>שימוש בסטודנטים</h4>
              <p><strong>{matchingSummary.studentsUsed}</strong> סטודנטים שובצו</p>
              <p><strong>{matchingSummary.studentsNotUsed}</strong> סטודנטים לא שובצו</p>
            </div>
            <div className="summary-section">
              <h4>איכות התאמות</h4>
              <p>ציון ממוצע: <strong>{matchingSummary.avgScore}%</strong></p>
              <p className="score-high"><strong>{matchingSummary.highScoreMatches}</strong> גבוה (70%+)</p>
              <p className="score-medium"><strong>{matchingSummary.mediumScoreMatches}</strong> בינוני (30-69%)</p>
              <p className="score-low"><strong>{matchingSummary.lowScoreMatches}</strong> נמוך (&lt;30%)</p>
            </div>
          </div>
          <p className="summary-total">סה"כ <strong>{matchingSummary.totalMatches}</strong> התאמות נוצרו</p>

          {matchingSummary.unassignedStudents.length > 0 && (
            <div className="unassigned-students-section">
              <h4>סטודנטים שלא שובצו ({matchingSummary.unassignedStudents.length})</h4>
              <table className="unassigned-table">
                <thead>
                  <tr>
                    <th>שם</th>
                    <th>מזהה</th>
                    <th>עיר</th>
                    <th>שפת אם</th>
                    <th>מגדר</th>
                    <th>סיבה</th>
                  </tr>
                </thead>
                <tbody>
                  {matchingSummary.unassignedStudents.map((s) => (
                    <tr key={s.contact_id}>
                      <td>{s.name}</td>
                      <td className="id-cell">{s.contact_id}</td>
                      <td>{s.city}</td>
                      <td>{s.motherTongue}</td>
                      <td>{s.gender}</td>
                      <td className="reason-cell">{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div className="matches-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">סה"כ התאמות</span>
          </div>
          <div className="stat-card success">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">אושרו</span>
          </div>
          <div className="stat-card danger">
            <span className="stat-value">{stats.rejected}</span>
            <span className="stat-label">נדחו</span>
          </div>
          <div className="stat-card warning">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">ממתינות</span>
          </div>
          <div className="stat-card info">
            <span className="stat-value">{stats.avgScore}%</span>
            <span className="stat-label">ציון ממוצע</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.primary} / {stats.secondary}</span>
            <span className="stat-label">ראשי / חלופי</span>
          </div>
        </div>
      )}

      <div className="matches-filters">
        <div className="filter-group">
          <Filter size={16} />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">כל הסטטוסים</option>
            <option value="suggested">ממתין לאישור</option>
            <option value="approved">אושר</option>
            <option value="rejected">נדחה</option>
          </select>
        </div>

        <div className="filter-group">
          <select value={filterRank} onChange={(e) => setFilterRank(e.target.value)}>
            <option value="">כל הדירוגים</option>
            <option value="1">התאמה ראשית</option>
            <option value="2">התאמה חלופית</option>
          </select>
        </div>

        <div className="filter-group">
          <label>ציון מינימלי:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={minScore}
            onChange={(e) => setMinScore(parseInt(e.target.value))}
          />
          <span>{minScore}%</span>
        </div>
      </div>

      {students.length === 0 || soldiers.length === 0 ? (
        <div className="empty-state">
          <p>יש להעלות קבצי סטודנטים וחיילים לפני הרצת ההתאמה</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="empty-state">
          <Play size={48} />
          <p>לחץ על "הרץ התאמה" כדי למצוא התאמות אפשריות</p>
        </div>
      ) : (
        <div className="matches-table-wrapper">
          <table className="matches-table">
            <thead>
              <tr>
                <th>דירוג</th>
                <th onClick={() => handleSort('confidence_score')} className="sortable">
                  ציון <SortIcon field="confidence_score" />
                </th>
                <th>סטודנט</th>
                <th onClick={() => handleSort('student_city')} className="sortable">
                  עיר סטודנט <SortIcon field="student_city" />
                </th>
                <th onClick={() => handleSort('language')} className="sortable">
                  שפה <SortIcon field="language" />
                </th>
                <th>חייל</th>
                <th onClick={() => handleSort('soldier_city')} className="sortable">
                  עיר חייל <SortIcon field="soldier_city" />
                </th>
                <th>סטטוס</th>
                <th>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map(match => (
                <React.Fragment key={match.id}>
                  <tr
                    className={`match-row ${match.status} ${expandedMatch === match.id ? 'expanded' : ''}`}
                    onClick={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                  >
                    <td>
                      <span className={`rank-badge rank-${match.match_rank}`}>
                        {match.match_rank === 1 ? 'ראשי' : 'חלופי'}
                      </span>
                    </td>
                    <td>
                      <div className="score-cell">
                        <div 
                          className="score-bar" 
                          style={{ width: `${match.confidence_score}%` }}
                        ></div>
                        <span className="score-value">{match.confidence_score}%</span>
                      </div>
                    </td>
                    <td className="name-cell">
                      <span className="display-name">{getStudentDisplay(match)}</span>
                      <span className="id-hint" title="מזהה Salesforce">
                        {match.student_external_id.slice(-6)}
                      </span>
                    </td>
                    <td>
                      <span className="city-display">
                        {match.student?.city || '-'}
                        {match.student?.city_code && (
                          <span className="code-badge" title="קוד עיר לענן">
                            <Cloud size={10} />
                            {match.student.city_code}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className="language-badge">
                        {match.student?.mother_tongue || '-'}
                        {match.student?.mother_tongue_code && (
                          <span className="code-suffix">({match.student.mother_tongue_code})</span>
                        )}
                      </span>
                    </td>
                    <td className="name-cell">
                      <span className="display-name">{getSoldierDisplay(match)}</span>
                      <span className="id-hint" title="מזהה Salesforce">
                        {match.soldier_external_id.slice(-6)}
                      </span>
                    </td>
                    <td>
                      <span className="city-display">
                        {match.soldier?.city || '-'}
                        {match.soldier?.city_code && (
                          <span className="code-badge" title="קוד עיר לענן">
                            <Cloud size={10} />
                            {match.soldier.city_code}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${match.status}`}>
                        {match.status === 'suggested' ? 'ממתין' : 
                         match.status === 'approved' ? 'אושר' : 'נדחה'}
                      </span>
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      {match.status === 'suggested' && (
                        <>
                          <button 
                            className="action-btn approve"
                            onClick={() => updateMatchStatus(match.id, 'approved')}
                            title="אשר התאמה"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button 
                            className="action-btn reject"
                            onClick={() => updateMatchStatus(match.id, 'rejected')}
                            title="דחה התאמה"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {expandedMatch === match.id && (
                    <tr className="match-details-row">
                      <td colSpan={9}>
                        <div className="match-details">
                          <div className="details-section criteria">
                            <h4>קריטריוני התאמה:</h4>
                            <ul className="criteria-list">
                              <li className={match.match_criteria.language_match ? 'match' : 'no-match'}>
                                {match.match_criteria.language_match ? '✓' : '✗'} התאמת שפה
                              </li>
                              <li className={match.match_criteria.region_match ? 'match' : 'no-match'}>
                                {match.match_criteria.region_match ? '✓' : '✗'} התאמת אזור
                              </li>
                              <li className={match.match_criteria.gender_pref_match ? 'match' : 'no-match'}>
                                {match.match_criteria.gender_pref_match ? '✓' : '✗'} העדפת מגדר
                              </li>
                              <li>
                                ציון מרחק: {match.match_criteria.distance_score}%
                              </li>
                            </ul>
                          </div>
                          <div className="details-section">
                            <h4>פרטי סטודנט:</h4>
                            <p>מין: {match.student?.gender || '-'}</p>
                            <p>מקומות פנויים: {match.student?.available_slots}</p>
                            <p>מלגה: {match.student?.is_scholarship_active ? 'כן' : 'לא'}</p>
                            <p>אזור: {match.student?.region || '-'}</p>
                            <p>רכז: {match.student?.coordinator || '-'}</p>
                            {match.student?.notes && (
                              <div className="notes-box student-notes">
                                <strong>הערות לסטטוס:</strong>
                                <p>{match.student.notes}</p>
                              </div>
                            )}
                          </div>
                          <div className="details-section">
                            <h4>פרטי חייל:</h4>
                            <p>מין: {match.soldier?.gender || '-'}</p>
                            <p>העדפת מתנדב: {match.soldier?.volunteer_gender_preference || 'לא צוין'}</p>
                            <p>אזור: {match.soldier?.region || '-'}</p>
                            <p>רכז: {match.soldier?.coordinator || '-'}</p>
                            {match.soldier?.notes && (
                              <div className="notes-box soldier-notes">
                                <strong>הערות לסטטוס:</strong>
                                <p>{match.soldier.notes}</p>
                              </div>
                            )}
                            {match.soldier?.special_requests && (
                              <div className="notes-box special-requests-box">
                                <strong>בקשות מיוחדות:</strong>
                                <p>{match.soldier.special_requests}</p>
                              </div>
                            )}
                            {match.soldier?.has_special_requests && !match.soldier?.special_requests && (
                              <p className="special-requests-warning">
                                יש בקשות מיוחדות - יש לבדוק ידנית
                              </p>
                            )}
                          </div>
                          <div className="details-section cloud-data">
                            <h4><Cloud size={14} /> נתונים שעולים לענן:</h4>
                            <code>
                              student: {match.student_external_id}, {match.student?.city_code}, {match.student?.mother_tongue_code}
                              <br />
                              soldier: {match.soldier_external_id}, {match.soldier?.city_code}, {match.soldier?.mother_tongue_code}
                            </code>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
