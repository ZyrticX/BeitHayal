import { useMemo } from 'react';
import { Users, UserCheck, FileSpreadsheet, MapPin, Languages, TrendingUp, Shield, Cloud } from 'lucide-react';
import type { LocalStudent, LocalSoldier, EnrichedMatch } from '../lib/supabase-secure';

interface DashboardProps {
  students: LocalStudent[];
  soldiers: LocalSoldier[];
  matches: EnrichedMatch[];
}

export default function Dashboard({ students, soldiers, matches }: DashboardProps) {
  const stats = useMemo(() => {
    // Student stats
    const availableStudents = students.filter(s => s.available_slots > 0);
    const studentsByLanguage = students.reduce((acc, s) => {
      const lang = s.mother_tongue || 'לא צוין';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const studentsByCity = students.reduce((acc, s) => {
      const city = s.city || 'לא צוין';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Soldier stats
    const awaitingSoldiers = soldiers.filter(s => 
      s.soldier_status === 'מחכה לשיבוץ' || s.soldier_status === 'ממתין לשיחה'
    );

    const soldiersByLanguage = soldiers.reduce((acc, s) => {
      const lang = s.mother_tongue || 'לא צוין';
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const soldiersByCity = soldiers.reduce((acc, s) => {
      const city = s.city || 'לא צוין';
      acc[city] = (acc[city] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Match stats
    const approvedMatches = matches.filter(m => m.status === 'approved');
    const avgScore = matches.length > 0 
      ? Math.round(matches.reduce((sum, m) => sum + m.confidence_score, 0) / matches.length)
      : 0;

    // Get top languages
    const topStudentLanguages = Object.entries(studentsByLanguage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    const topSoldierLanguages = Object.entries(soldiersByLanguage)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Get top cities
    const topStudentCities = Object.entries(studentsByCity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topSoldierCities = Object.entries(soldiersByCity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Region distribution (codes that go to cloud)
    const studentsByRegion = students.reduce((acc, s) => {
      const region = s.region || 'לא ידוע';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const soldiersByRegion = soldiers.reduce((acc, s) => {
      const region = s.region || 'לא ידוע';
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      students: {
        total: students.length,
        available: availableStudents.length,
        totalSlots: students.reduce((sum, s) => sum + (s.available_slots || 0), 0),
        withScholarship: students.filter(s => s.is_scholarship_active).length,
        topLanguages: topStudentLanguages,
        topCities: topStudentCities,
        byRegion: studentsByRegion,
      },
      soldiers: {
        total: soldiers.length,
        awaiting: awaitingSoldiers.length,
        withSpecialRequests: soldiers.filter(s => s.has_special_requests).length,
        topLanguages: topSoldierLanguages,
        topCities: topSoldierCities,
        byRegion: soldiersByRegion,
      },
      matches: {
        total: matches.length,
        approved: approvedMatches.length,
        pending: matches.filter(m => m.status === 'suggested').length,
        rejected: matches.filter(m => m.status === 'rejected').length,
        avgScore,
      },
    };
  }, [students, soldiers, matches]);

  const isEmpty = students.length === 0 && soldiers.length === 0;

  if (isEmpty) {
    return (
      <div className="dashboard empty">
        <div className="empty-state large">
          <TrendingUp size={64} />
          <h2>ברוכים הבאים למערכת ההתאמה</h2>
          <p>העלה קבצי סטודנטים וחיילים כדי להתחיל</p>
          <p className="hint">עבור ללשונית "העלאת קבצים" כדי להתחיל</p>
          
          <div className="security-highlight">
            <Shield size={24} />
            <div>
              <h4>מערכת מאובטחת</h4>
              <p>מידע אישי נשאר מקומי בלבד - רק קודים אנונימיים עולים לענן</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>סקירה כללית</h2>
        <div className="security-badge-dashboard">
          <Shield size={16} />
          <span>נתונים מאובטחים</span>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card large blue">
          <div className="stat-icon">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.students.total}</span>
            <span className="stat-label">סטודנטים</span>
            <span className="stat-detail">{stats.students.available} עם מקומות פנויים</span>
          </div>
        </div>

        <div className="stat-card large green">
          <div className="stat-icon">
            <UserCheck size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.soldiers.total}</span>
            <span className="stat-label">חיילים</span>
            <span className="stat-detail">{stats.soldiers.awaiting} ממתינים לשיבוץ</span>
          </div>
        </div>

        <div className="stat-card large purple">
          <div className="stat-icon">
            <FileSpreadsheet size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.matches.total}</span>
            <span className="stat-label">התאמות</span>
            <span className="stat-detail">{stats.matches.approved} אושרו</span>
          </div>
        </div>

        <div className="stat-card large orange">
          <div className="stat-icon">
            <TrendingUp size={32} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.matches.avgScore}%</span>
            <span className="stat-label">ציון ממוצע</span>
            <span className="stat-detail">{stats.students.totalSlots} מקומות פנויים</span>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="charts-grid">
        {/* Languages Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <Languages size={20} />
            <h3>התפלגות שפות - סטודנטים</h3>
          </div>
          <div className="bar-chart">
            {stats.students.topLanguages.map(([lang, count]) => (
              <div key={lang} className="bar-item">
                <span className="bar-label">{lang}</span>
                <div className="bar-container">
                  <div 
                    className="bar" 
                    style={{ 
                      width: `${(count / stats.students.total) * 100}%`,
                      backgroundColor: '#3b82f6'
                    }}
                  ></div>
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <Languages size={20} />
            <h3>התפלגות שפות - חיילים</h3>
          </div>
          <div className="bar-chart">
            {stats.soldiers.topLanguages.map(([lang, count]) => (
              <div key={lang} className="bar-item">
                <span className="bar-label">{lang}</span>
                <div className="bar-container">
                  <div 
                    className="bar" 
                    style={{ 
                      width: `${(count / stats.soldiers.total) * 100}%`,
                      backgroundColor: '#10b981'
                    }}
                  ></div>
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cities Distribution */}
        <div className="chart-card">
          <div className="chart-header">
            <MapPin size={20} />
            <h3>ערים מובילות - סטודנטים</h3>
          </div>
          <div className="bar-chart">
            {stats.students.topCities.map(([city, count]) => (
              <div key={city} className="bar-item">
                <span className="bar-label">{city}</span>
                <div className="bar-container">
                  <div 
                    className="bar" 
                    style={{ 
                      width: `${(count / stats.students.total) * 100}%`,
                      backgroundColor: '#8b5cf6'
                    }}
                  ></div>
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <MapPin size={20} />
            <h3>ערים מובילות - חיילים</h3>
          </div>
          <div className="bar-chart">
            {stats.soldiers.topCities.map(([city, count]) => (
              <div key={city} className="bar-item">
                <span className="bar-label">{city}</span>
                <div className="bar-container">
                  <div 
                    className="bar" 
                    style={{ 
                      width: `${(count / stats.soldiers.total) * 100}%`,
                      backgroundColor: '#f59e0b'
                    }}
                  ></div>
                </div>
                <span className="bar-value">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Region Distribution (Cloud Data) */}
      <div className="region-stats">
        <div className="region-header">
          <Cloud size={20} />
          <h3>התפלגות לפי אזור (נתונים שעולים לענן)</h3>
        </div>
        <div className="region-grid">
          <div className="region-card">
            <h4>סטודנטים</h4>
            <div className="region-bars">
              {Object.entries(stats.students.byRegion).map(([region, count]) => (
                <div key={region} className="region-item">
                  <span className="region-label">{region}</span>
                  <span className="region-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="region-card">
            <h4>חיילים</h4>
            <div className="region-bars">
              {Object.entries(stats.soldiers.byRegion).map(([region, count]) => (
                <div key={region} className="region-item">
                  <span className="region-label">{region}</span>
                  <span className="region-count">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Match Status Summary */}
      {matches.length > 0 && (
        <div className="match-summary">
          <h3>סטטוס התאמות</h3>
          <div className="status-bars">
            <div className="status-bar-item">
              <span className="status-label">ממתינות לאישור</span>
              <div className="status-bar-container">
                <div 
                  className="status-bar pending"
                  style={{ width: `${(stats.matches.pending / stats.matches.total) * 100}%` }}
                ></div>
              </div>
              <span className="status-value">{stats.matches.pending}</span>
            </div>
            <div className="status-bar-item">
              <span className="status-label">אושרו</span>
              <div className="status-bar-container">
                <div 
                  className="status-bar approved"
                  style={{ width: `${(stats.matches.approved / stats.matches.total) * 100}%` }}
                ></div>
              </div>
              <span className="status-value">{stats.matches.approved}</span>
            </div>
            <div className="status-bar-item">
              <span className="status-label">נדחו</span>
              <div className="status-bar-container">
                <div 
                  className="status-bar rejected"
                  style={{ width: `${(stats.matches.rejected / stats.matches.total) * 100}%` }}
                ></div>
              </div>
              <span className="status-value">{stats.matches.rejected}</span>
            </div>
          </div>
        </div>
      )}

      {/* Security Summary */}
      <div className="security-summary-dashboard">
        <Shield size={24} />
        <div className="security-content">
          <h4>סיכום אבטחת מידע</h4>
          <p>
            <strong>{stats.soldiers.withSpecialRequests}</strong> חיילים עם בקשות מיוחדות - 
            הטקסט נשאר מקומי, רק דגל עולה לענן.
          </p>
          <p>
            כל המידע האישי (שמות, טלפונים, מיילים) נשמר בזיכרון המקומי בלבד.
          </p>
        </div>
      </div>
    </div>
  );
}
