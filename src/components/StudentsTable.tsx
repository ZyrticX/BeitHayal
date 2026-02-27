import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Shield, Cloud } from 'lucide-react';
import type { LocalStudent } from '../lib/supabase-secure';

interface StudentsTableProps {
  students: LocalStudent[];
  setStudents: (students: LocalStudent[]) => void;
}

type SortField = 'contact_id' | 'mother_tongue' | 'city' | 'gender' | 'current_soldiers_count' | 'available_slots';
type SortOrder = 'asc' | 'desc';

export default function StudentsTable({ students }: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('contact_id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showCodes, setShowCodes] = useState(false);

  // Get unique values for filters
  const uniqueLanguages = useMemo(() => 
    [...new Set(students.map(s => s.mother_tongue).filter(Boolean))].sort(),
    [students]
  );
  
  const uniqueCities = useMemo(() => 
    [...new Set(students.map(s => s.city).filter(Boolean))].sort(),
    [students]
  );

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.contact_id?.toLowerCase().includes(term) ||
        s.full_name?.toLowerCase().includes(term) ||
        s.mother_tongue?.toLowerCase().includes(term) ||
        s.city?.toLowerCase().includes(term)
      );
    }

    // Language filter
    if (filterLanguage) {
      result = result.filter(s => s.mother_tongue === filterLanguage);
    }

    // City filter
    if (filterCity) {
      result = result.filter(s => s.city === filterCity);
    }

    // Status filter
    if (filterStatus === 'available') {
      result = result.filter(s => s.available_slots > 0);
    } else if (filterStatus === 'full') {
      result = result.filter(s => s.available_slots === 0);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number | boolean | null = null;
      let bVal: string | number | boolean | null = null;

      switch (sortField) {
        case 'contact_id':
          aVal = a.contact_id;
          bVal = b.contact_id;
          break;
        case 'mother_tongue':
          aVal = a.mother_tongue;
          bVal = b.mother_tongue;
          break;
        case 'city':
          aVal = a.city;
          bVal = b.city;
          break;
        case 'gender':
          aVal = a.gender;
          bVal = b.gender;
          break;
        case 'current_soldiers_count':
          aVal = a.current_soldiers_count;
          bVal = b.current_soldiers_count;
          break;
        case 'available_slots':
          aVal = a.available_slots;
          bVal = b.available_slots;
          break;
      }
      
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';
      
      const aCompare = aVal ?? '';
      const bCompare = bVal ?? '';
      
      if (aCompare < bCompare) return sortOrder === 'asc' ? -1 : 1;
      if (aCompare > bCompare) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [students, searchTerm, filterLanguage, filterCity, filterStatus, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="table-container">
      <div className="table-header">
        <div className="table-title">
          <h2>רשימת סטודנטים ({filteredStudents.length} מתוך {students.length})</h2>
          <button 
            className={`toggle-codes-btn ${showCodes ? 'active' : ''}`}
            onClick={() => setShowCodes(!showCodes)}
            title="הצג קודים שעולים לענן"
          >
            <Cloud size={16} />
            {showCodes ? 'הסתר קודים' : 'הצג קודים'}
          </button>
        </div>
        
        <div className="table-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <Filter size={16} />
            <select 
              value={filterLanguage} 
              onChange={(e) => setFilterLanguage(e.target.value)}
            >
              <option value="">כל השפות</option>
              {uniqueLanguages.map(lang => (
                <option key={lang} value={lang!}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select 
              value={filterCity} 
              onChange={(e) => setFilterCity(e.target.value)}
            >
              <option value="">כל הערים</option>
              {uniqueCities.map(city => (
                <option key={city} value={city!}>{city}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">כל הסטטוסים</option>
              <option value="available">עם מקומות פנויים</option>
              <option value="full">מלאים</option>
            </select>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="security-info-bar compact">
        <Shield size={14} />
        <span>המידע האישי (שם, טלפון) נשאר מקומי בלבד. רק קודים עולים לענן.</span>
      </div>

      {/* Name Warning */}
      {students.length > 0 && !students.some(s => s.full_name) && (
        <div className="warning-info-bar">
          <span>⚠️ <strong>שמות לא זמינים</strong> - הקובץ לא מכיל עמודת שם. הוסף עמודת "שם מלא" או "שם פרטי" + "שם משפחה" ב-Salesforce.</span>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('contact_id')} className="sortable">
                מזהה <SortIcon field="contact_id" />
              </th>
              <th>שם</th>
              <th onClick={() => handleSort('mother_tongue')} className="sortable">
                שפת אם <SortIcon field="mother_tongue" />
                {showCodes && <span className="code-header">קוד</span>}
              </th>
              <th onClick={() => handleSort('city')} className="sortable">
                עיר <SortIcon field="city" />
                {showCodes && <span className="code-header">קוד</span>}
              </th>
              <th onClick={() => handleSort('gender')} className="sortable">
                מין <SortIcon field="gender" />
              </th>
              <th onClick={() => handleSort('current_soldiers_count')} className="sortable">
                חיילים נוכחיים <SortIcon field="current_soldiers_count" />
              </th>
              <th onClick={() => handleSort('available_slots')} className="sortable">
                מקומות פנויים <SortIcon field="available_slots" />
              </th>
              <th>מלגה</th>
              <th>סטטוס</th>
              {showCodes && <th className="cloud-column">אזור</th>}
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.contact_id} className={student.available_slots === 0 ? 'row-disabled' : ''}>
                <td className="id-cell">
                  <span className="id-short" title={student.contact_id}>
                    ...{student.contact_id.slice(-8)}
                  </span>
                </td>
                <td className="name-cell">
                  {student.full_name || (
                    <span className="id-as-name" title={`מזהה: ${student.contact_id}`}>
                      {student.coordinator ? `🧑‍💼 ${student.coordinator}` : `ID: ${student.contact_id.slice(-8)}`}
                    </span>
                  )}
                </td>
                <td>
                  <span className="language-badge">
                    {student.mother_tongue || '-'}
                    {showCodes && student.mother_tongue_code && (
                      <span className="code-badge cloud">
                        <Cloud size={10} />
                        {student.mother_tongue_code}
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  <span className="city-cell">
                    {student.city || '-'}
                    {showCodes && student.city_code && (
                      <span className="code-badge cloud">
                        <Cloud size={10} />
                        {student.city_code}
                      </span>
                    )}
                  </span>
                </td>
                <td>{student.gender === 'זכר' ? '👨' : student.gender === 'נקבה' ? '👩' : '-'}</td>
                <td className="number-cell">{student.current_soldiers_count}</td>
                <td className="number-cell">
                  <span className={`slots-badge ${student.available_slots > 0 ? 'available' : 'full'}`}>
                    {student.available_slots} / {student.max_soldiers}
                  </span>
                </td>
                <td>{student.is_scholarship_active ? '✓' : '-'}</td>
                <td>
                  <span className={`status-badge ${student.volunteer_status === 'ממתין לשיבוץ' ? 'waiting' : 'other'}`}>
                    {student.volunteer_status || '-'}
                  </span>
                </td>
                {showCodes && (
                  <td className="cloud-column">
                    <span className="code-badge cloud">{student.region || '-'}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStudents.length === 0 && (
        <div className="empty-state">
          <p>לא נמצאו סטודנטים התואמים לחיפוש</p>
        </div>
      )}
    </div>
  );
}
