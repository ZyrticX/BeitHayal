import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, X, Shield, AlertTriangle } from 'lucide-react';
import { parseStudentsFile, parseSoldiersFile } from '../lib/excelParser-secure';
import type { LocalStudent, LocalSoldier } from '../lib/supabase-secure';

interface UploadPanelProps {
  onStudentsLoaded: (students: LocalStudent[]) => void;
  onSoldiersLoaded: (soldiers: LocalSoldier[]) => void;
  setIsLoading: (loading: boolean) => void;
}

interface UploadStatus {
  type: 'success' | 'error' | 'warning';
  message: string;
  warnings?: string[];
}

export default function UploadPanel({ 
  onStudentsLoaded, 
  onSoldiersLoaded,
  setIsLoading 
}: UploadPanelProps) {
  const [studentsStatus, setStudentsStatus] = useState<UploadStatus | null>(null);
  const [soldiersStatus, setSoldiersStatus] = useState<UploadStatus | null>(null);
  const [dragOver, setDragOver] = useState<'students' | 'soldiers' | null>(null);

  const handleStudentsUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setStudentsStatus(null);
    
    try {
      const result = await parseStudentsFile(file);
      
      if (result.errors.length > 0) {
        setStudentsStatus({
          type: 'error',
          message: `שגיאות: ${result.errors.join(', ')}`
        });
      } else {
        onStudentsLoaded(result.data);
        setStudentsStatus({
          type: result.warnings.length > 0 ? 'warning' : 'success',
          message: `נטענו ${result.data.length} סטודנטים בהצלחה`,
          warnings: result.warnings
        });
      }
    } catch (err) {
      setStudentsStatus({
        type: 'error',
        message: `שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [onStudentsLoaded, setIsLoading]);

  const handleSoldiersUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setSoldiersStatus(null);
    
    try {
      const result = await parseSoldiersFile(file);
      
      if (result.errors.length > 0) {
        setSoldiersStatus({
          type: 'error',
          message: `שגיאות: ${result.errors.join(', ')}`
        });
      } else {
        onSoldiersLoaded(result.data);
        setSoldiersStatus({
          type: result.warnings.length > 0 ? 'warning' : 'success',
          message: `נטענו ${result.data.length} חיילים בהצלחה`,
          warnings: result.warnings
        });
      }
    } catch (err) {
      setSoldiersStatus({
        type: 'error',
        message: `שגיאה בקריאת הקובץ: ${err instanceof Error ? err.message : 'שגיאה לא ידועה'}`
      });
    } finally {
      setIsLoading(false);
    }
  }, [onSoldiersLoaded, setIsLoading]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'students' | 'soldiers') => {
    e.preventDefault();
    setDragOver(null);
    
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      if (type === 'students') {
        handleStudentsUpload(file);
      } else {
        handleSoldiersUpload(file);
      }
    }
  }, [handleStudentsUpload, handleSoldiersUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'students' | 'soldiers') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'students') {
        handleStudentsUpload(file);
      } else {
        handleSoldiersUpload(file);
      }
    }
  }, [handleStudentsUpload, handleSoldiersUpload]);

  return (
    <div className="upload-panel">
      <div className="upload-header">
        <h2>העלאת קבצי אקסל</h2>
        <p>העלה את קבצי הסטודנטים והחיילים להתחלת תהליך ההתאמה</p>
      </div>

      {/* Security Notice */}
      <div className="security-notice-box">
        <Shield size={20} />
        <div>
          <strong>מידע על אבטחה:</strong>
          <p>
            המידע האישי (שמות, טלפונים, מיילים, כתובות) נשאר <strong>מקומי בלבד</strong> במחשב שלך.
            רק קודים אנונימיים (קוד עיר, קוד שפה) נשלחים לענן לצורך ההתאמה.
          </p>
        </div>
      </div>

      <div className="upload-grid">
        {/* Students Upload */}
        <div className="upload-card">
          <div className="upload-card-header">
            <FileSpreadsheet size={24} />
            <h3>קובץ סטודנטים</h3>
          </div>
          
          <div 
            className={`upload-dropzone ${dragOver === 'students' ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver('students'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, 'students')}
          >
            <Upload size={48} />
            <p>גרור קובץ לכאן או</p>
            <label className="upload-button">
              בחר קובץ
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e, 'students')}
                hidden
              />
            </label>
            <span className="file-types">.xlsx, .xls</span>
          </div>

          {studentsStatus && (
            <div className={`upload-status ${studentsStatus.type}`}>
              {studentsStatus.type === 'success' ? (
                <CheckCircle size={20} />
              ) : studentsStatus.type === 'warning' ? (
                <AlertTriangle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <div className="status-content">
                <span>{studentsStatus.message}</span>
                {studentsStatus.warnings && studentsStatus.warnings.length > 0 && (
                  <details className="warnings-details">
                    <summary>{studentsStatus.warnings.length} אזהרות</summary>
                    <ul>
                      {studentsStatus.warnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {studentsStatus.warnings.length > 5 && (
                        <li>...ועוד {studentsStatus.warnings.length - 5} אזהרות</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
              <button onClick={() => setStudentsStatus(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          <div className="upload-info">
            <h4>עמודות נדרשות:</h4>
            <ul>
              <li><strong>מזהה איש קשר</strong> - מזהה Salesforce</li>
              <li>שפת אם</li>
              <li>עיר / עיר מגורים</li>
              <li>מין</li>
              <li>כמות חיילים</li>
              <li>האם פעיל במלגה</li>
              <li>סטטוס מתנדב/ת</li>
            </ul>
            <div className="pii-notice">
              <Shield size={14} />
              <span>שמות וטלפונים נקראים לתצוגה בלבד - לא עולים לענן</span>
            </div>
          </div>
        </div>

        {/* Soldiers Upload */}
        <div className="upload-card">
          <div className="upload-card-header">
            <FileSpreadsheet size={24} />
            <h3>קובץ חיילים</h3>
          </div>
          
          <div 
            className={`upload-dropzone ${dragOver === 'soldiers' ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver('soldiers'); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => handleDrop(e, 'soldiers')}
          >
            <Upload size={48} />
            <p>גרור קובץ לכאן או</p>
            <label className="upload-button">
              בחר קובץ
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e, 'soldiers')}
                hidden
              />
            </label>
            <span className="file-types">.xlsx, .xls</span>
          </div>

          {soldiersStatus && (
            <div className={`upload-status ${soldiersStatus.type}`}>
              {soldiersStatus.type === 'success' ? (
                <CheckCircle size={20} />
              ) : soldiersStatus.type === 'warning' ? (
                <AlertTriangle size={20} />
              ) : (
                <AlertCircle size={20} />
              )}
              <div className="status-content">
                <span>{soldiersStatus.message}</span>
                {soldiersStatus.warnings && soldiersStatus.warnings.length > 0 && (
                  <details className="warnings-details">
                    <summary>{soldiersStatus.warnings.length} אזהרות</summary>
                    <ul>
                      {soldiersStatus.warnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {soldiersStatus.warnings.length > 5 && (
                        <li>...ועוד {soldiersStatus.warnings.length - 5} אזהרות</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
              <button onClick={() => setSoldiersStatus(null)}>
                <X size={16} />
              </button>
            </div>
          )}

          <div className="upload-info">
            <h4>עמודות נדרשות:</h4>
            <ul>
              <li><strong>מזהה איש קשר</strong> - מזהה Salesforce</li>
              <li>שפת אם</li>
              <li>עיר / עיר מגורים</li>
              <li>מין</li>
              <li>מתנדב או מתנדבת (העדפה)</li>
              <li>בקשות מיוחדות</li>
              <li>סטטוס חייל</li>
            </ul>
            <div className="pii-notice">
              <Shield size={14} />
              <span>בקשות מיוחדות נשארות מקומיות - רק דגל קיום עולה לענן</span>
            </div>
          </div>
        </div>
      </div>

      <div className="upload-instructions">
        <h3>הוראות שימוש</h3>
        <ol>
          <li>העלה את קובץ הסטודנטים (מתנדבים)</li>
          <li>העלה את קובץ החיילים</li>
          <li>עבור ללשונית "התאמות" להרצת אלגוריתם ההתאמה</li>
          <li>בדוק ואשר את ההתאמות המוצעות</li>
          <li>ייצא את התוצאות לאקסל</li>
        </ol>
        
        <div className="security-summary">
          <h4><Shield size={16} /> סיכום אבטחת מידע</h4>
          <div className="security-columns">
            <div className="security-column local">
              <h5>🏠 נשאר מקומי</h5>
              <ul>
                <li>שמות מלאים</li>
                <li>טלפונים</li>
                <li>מיילים</li>
                <li>כתובות מלאות</li>
                <li>הערות וטקסטים חופשיים</li>
              </ul>
            </div>
            <div className="security-column cloud">
              <h5>☁️ עולה לענן (קודים בלבד)</h5>
              <ul>
                <li>מזהה Salesforce</li>
                <li>קוד מגדר (M/F)</li>
                <li>קוד עיר (TLV/HFA)</li>
                <li>קוד שפה (HE/RU/UK)</li>
                <li>סטטוס (waiting/matched)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
