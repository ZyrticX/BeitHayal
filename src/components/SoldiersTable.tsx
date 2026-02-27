import { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, Shield, Cloud, AlertTriangle } from 'lucide-react';
import type { LocalSoldier } from '../lib/supabase-secure';

interface SoldiersTableProps {
  soldiers: LocalSoldier[];
  setSoldiers: (soldiers: LocalSoldier[]) => void;
}

type SortField = 'contact_id' | 'mother_tongue' | 'city' | 'gender' | 'volunteer_gender_preference' | 'soldier_status';
type SortOrder = 'asc' | 'desc';

export default function SoldiersTable({ soldiers }: SoldiersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('contact_id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showCodes, setShowCodes] = useState(false);

  // Get unique values for filters
  const uniqueLanguages = useMemo(() => 
    [...new Set(soldiers.map(s => s.mother_tongue).filter(Boolean))].sort(),
    [soldiers]
  );
  
  const uniqueCities = useMemo(() => 
    [...new Set(soldiers.map(s => s.city).filter(Boolean))].sort(),
    [soldiers]
  );

  const uniqueStatuses = useMemo(() => 
    [...new Set(soldiers.map(s => s.soldier_status).filter(Boolean))].sort(),
    [soldiers]
  );

  // Filter and sort soldiers
  const filteredSoldiers = useMemo(() => {
    let result = [...soldiers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.contact_id?.toLowerCase().includes(term) ||
        s.full_name?.toLowerCase().includes(term) ||
        s.mother_tongue?.toLowerCase().includes(term) ||
        s.city?.toLowerCase().includes(term) ||
        s.special_requests?.toLowerCase().includes(term)
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
    if (filterStatus) {
      result = result.filter(s => s.soldier_status === filterStatus);
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
        case 'volunteer_gender_preference':
          aVal = a.volunteer_gender_preference;
          bVal = b.volunteer_gender_preference;
          break;
        case 'soldier_status':
          aVal = a.soldier_status;
          bVal = b.soldier_status;
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
  }, [soldiers, searchTerm, filterLanguage, filterCity, filterStatus, sortField, sortOrder]);

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
          <h2>רשימת חיילים ({filteredSoldiers.length} מתוך {soldiers.length})</h2>
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
              {uniqueStatuses.map(status => (
                <option key={status} value={status!}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="security-info-bar compact">
        <Shield size={14} />
        <span>בקשות מיוחדות נשארות מקומיות - רק דגל "יש בקשות" עולה לענן.</span>
      </div>

      {/* Name Warning */}
      {soldiers.length > 0 && !soldiers.some(s => s.full_name) && (
        <div className="warning-info-bar">
          <span>⚠️ <strong>שמות לא זמינים</strong> - הקובץ לא מכיל עמודת שם. הוסף עמודת "שם מלא" ב-Salesforce.</span>
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
              <th onClick={() => handleSort('volunteer_gender_preference')} className="sortable">
                העדפת מתנדב <SortIcon field="volunteer_gender_preference" />
              </th>
              <th onClick={() => handleSort('soldier_status')} className="sortable">
                סטטוס <SortIcon field="soldier_status" />
              </th>
              <th>בקשות מיוחדות</th>
              {showCodes && <th className="cloud-column">אזור</th>}
            </tr>
          </thead>
          <tbody>
            {filteredSoldiers.map(soldier => (
              <tr key={soldier.contact_id}>
                <td className="id-cell">
                  <span className="id-short" title={soldier.contact_id}>
                    ...{soldier.contact_id.slice(-8)}
                  </span>
                </td>
                <td className="name-cell">
                  {soldier.full_name || (
                    <span className="id-as-name" title={`מזהה: ${soldier.contact_id}`}>
                      {soldier.coordinator ? `🧑‍💼 ${soldier.coordinator}` : `ID: ${soldier.contact_id.slice(-8)}`}
                    </span>
                  )}
                </td>
                <td>
                  <span className="language-badge">
                    {soldier.mother_tongue || '-'}
                    {showCodes && soldier.mother_tongue_code && (
                      <span className="code-badge cloud">
                        <Cloud size={10} />
                        {soldier.mother_tongue_code}
                      </span>
                    )}
                  </span>
                </td>
                <td>
                  <span className="city-cell">
                    {soldier.city || '-'}
                    {showCodes && soldier.city_code && (
                      <span className="code-badge cloud">
                        <Cloud size={10} />
                        {soldier.city_code}
                      </span>
                    )}
                  </span>
                </td>
                <td>{soldier.gender === 'זכר' ? '👨' : soldier.gender === 'נקבה' ? '👩' : '-'}</td>
                <td>
                  <span className={`preference-badge ${soldier.volunteer_gender_preference?.replace(/\s/g, '-') || 'none'}`}>
                    {soldier.volunteer_gender_preference || 'לא צוין'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${soldier.soldier_status === 'מחכה לשיבוץ' ? 'waiting' : 'other'}`}>
                    {soldier.soldier_status || '-'}
                  </span>
                </td>
                <td className="special-requests-cell">
                  {soldier.has_special_requests ? (
                    <div className="special-requests-indicator">
                      <AlertTriangle size={14} className="warning-icon" />
                      <span className="requests-preview" title={soldier.special_requests}>
                        {soldier.special_requests && soldier.special_requests.length > 30
                          ? soldier.special_requests.substring(0, 30) + '...'
                          : soldier.special_requests || 'יש בקשות'}
                      </span>
                      {showCodes && (
                        <span className="code-badge cloud local">
                          <Shield size={10} />
                          מקומי
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="no-requests">-</span>
                  )}
                </td>
                {showCodes && (
                  <td className="cloud-column">
                    <span className="code-badge cloud">{soldier.region || '-'}</span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredSoldiers.length === 0 && (
        <div className="empty-state">
          <p>לא נמצאו חיילים התואמים לחיפוש</p>
        </div>
      )}
    </div>
  );
}
