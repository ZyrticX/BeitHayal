import { useState } from 'react';
import { Upload, Users, UserCheck, FileSpreadsheet, BarChart3, Shield, LogOut, User } from 'lucide-react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import LoginPage from './components/LoginPage';
import UploadPanel from './components/UploadPanel';
import StudentsTable from './components/StudentsTable';
import SoldiersTable from './components/SoldiersTable';
import MatchesPanel from './components/MatchesPanel';
import Dashboard from './components/Dashboard';
import type { LocalStudent, LocalSoldier, EnrichedMatch } from './lib/supabase-secure';
import './App.css';

type TabType = 'dashboard' | 'upload' | 'students' | 'soldiers' | 'matches';

function MainApp() {
  const { user, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [students, setStudents] = useState<LocalStudent[]>([]);
  const [soldiers, setSoldiers] = useState<LocalSoldier[]>([]);
  const [matches, setMatches] = useState<EnrichedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner"></div>
        <p>טוען...</p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  const tabs = [
    { id: 'dashboard' as TabType, label: 'דשבורד', icon: BarChart3 },
    { id: 'upload' as TabType, label: 'העלאת קבצים', icon: Upload },
    { id: 'students' as TabType, label: 'סטודנטים', icon: Users, count: students.length },
    { id: 'soldiers' as TabType, label: 'חיילים', icon: UserCheck, count: soldiers.length },
    { id: 'matches' as TabType, label: 'התאמות', icon: FileSpreadsheet, count: matches.length },
  ];

  const handleLogout = async () => {
    if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
      await signOut();
    }
  };

  return (
    <div className="app" dir="rtl">
      <header className="app-header">
        <div className="header-content">
          <h1>מערכת התאמה - סטודנטים וחיילים</h1>
          <p>ניהול והתאמת מתנדבים לחיילים</p>
        </div>
        <div className="header-actions">
          <div className="user-info">
            <User size={16} />
            <span>{user.email}</span>
          </div>
          <button className="logout-button" onClick={handleLogout} title="התנתק">
            <LogOut size={18} />
            <span>התנתק</span>
          </button>
          <div className="security-badge">
            <Shield size={16} />
            <span>מאובטח</span>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="tab-badge">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="app-main">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>טוען...</p>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard 
            students={students} 
            soldiers={soldiers} 
            matches={matches}
          />
        )}

        {activeTab === 'upload' && (
          <UploadPanel
            onStudentsLoaded={setStudents}
            onSoldiersLoaded={setSoldiers}
            setIsLoading={setIsLoading}
          />
        )}

        {activeTab === 'students' && (
          <StudentsTable 
            students={students} 
            setStudents={setStudents}
          />
        )}

        {activeTab === 'soldiers' && (
          <SoldiersTable 
            soldiers={soldiers} 
            setSoldiers={setSoldiers}
          />
        )}

        {activeTab === 'matches' && (
          <MatchesPanel
            students={students}
            soldiers={soldiers}
            matches={matches}
            setMatches={setMatches}
            setIsLoading={setIsLoading}
          />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p>נוצר ב❤️ על ידי <strong>SmartMindsAI</strong> - עמותת CodeForIsrael</p>
          <div className="security-notice">
            <Shield size={14} />
            <span>מידע אישי נשמר מקומית בלבד - לא עולה לענן</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
