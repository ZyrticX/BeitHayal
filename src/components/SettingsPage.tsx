import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, Sliders, MapPin, Users, BarChart3 } from 'lucide-react';
import { loadSettings, saveSettings, DEFAULT_SETTINGS, type MatchingSettings } from '../lib/settingsService';

interface SettingsPageProps {
  onSettingsChanged: (settings: MatchingSettings) => void;
}

interface SettingFieldProps {
  label: string;
  description: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (val: number) => void;
}

function SettingField({ label, description, value, defaultValue, min, max, step = 1, suffix, onChange }: SettingFieldProps) {
  return (
    <div className="setting-field">
      <div className="setting-info">
        <label className="setting-label">{label}</label>
        <span className="setting-description">{description}</span>
      </div>
      <div className="setting-controls">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="setting-slider"
        />
        <div className="setting-value-wrapper">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="setting-input"
          />
          {suffix && <span className="setting-suffix">{suffix}</span>}
        </div>
        {value !== defaultValue && (
          <span className="setting-default-hint">
            ברירת מחדל: {defaultValue}{suffix || ''}
          </span>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage({ onSettingsChanged }: SettingsPageProps) {
  const [settings, setSettings] = useState<MatchingSettings>({ ...DEFAULT_SETTINGS });
  const [originalSettings, setOriginalSettings] = useState<MatchingSettings>({ ...DEFAULT_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings().then(loaded => {
      setSettings(loaded);
      setOriginalSettings(loaded);
      setLoading(false);
    });
  }, []);

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const update = useCallback((field: keyof MatchingSettings, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setMessage(null);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    const result = await saveSettings(settings);

    if (result.success) {
      setOriginalSettings(settings);
      onSettingsChanged(settings);
      setMessage({ type: 'success', text: 'ההגדרות נשמרו בהצלחה' });
    } else {
      setMessage({ type: 'error', text: `שגיאה בשמירה: ${result.error}` });
    }

    setSaving(false);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    setMessage(null);
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-loading">טוען הגדרות...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h2><Sliders size={24} /> הגדרות אלגוריתם התאמה</h2>
          <p>התאם את פרמטרי ההתאמה בין חיילים למתנדבים</p>
        </div>
        <div className="settings-actions">
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={saving}
          >
            <RotateCcw size={16} />
            איפוס לברירת מחדל
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            <Save size={16} />
            {saving ? 'שומר...' : 'שמור הגדרות'}
          </button>
        </div>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Base Scores Section */}
      <div className="settings-section">
        <h3><BarChart3 size={18} /> ציוני בסיס</h3>
        <p className="section-description">ציון ההתחלה לפני הפחתת מרחק, לפי רמת ההתאמה</p>

        <SettingField
          label="התאמת מגדר + שפה"
          description="הציון כשיש התאמה מלאה בשפה ובמגדר"
          value={settings.baseScoreFull}
          defaultValue={DEFAULT_SETTINGS.baseScoreFull}
          min={50} max={100}
          onChange={v => update('baseScoreFull', v)}
        />
        <SettingField
          label="התאמת שפה בלבד"
          description="הציון כשיש התאמת שפה אבל לא מגדר"
          value={settings.baseScoreLanguageOnly}
          defaultValue={DEFAULT_SETTINGS.baseScoreLanguageOnly}
          min={20} max={100}
          onChange={v => update('baseScoreLanguageOnly', v)}
        />
        <SettingField
          label="התאמת מגדר בלבד"
          description="הציון כשיש התאמת מגדר אבל לא שפה"
          value={settings.baseScoreGenderOnly}
          defaultValue={DEFAULT_SETTINGS.baseScoreGenderOnly}
          min={20} max={100}
          onChange={v => update('baseScoreGenderOnly', v)}
        />
      </div>

      {/* Distance Section */}
      <div className="settings-section">
        <h3><MapPin size={18} /> מרחק</h3>
        <p className="section-description">פרמטרי חישוב הפחתת מרחק מהציון</p>

        <SettingField
          label='מרחק ללא הפחתה (ק"מ)'
          description="עד מרחק זה לא מורידים ניקוד"
          value={settings.distanceNoPenaltyKm}
          defaultValue={DEFAULT_SETTINGS.distanceNoPenaltyKm}
          min={0} max={50}
          suffix=' ק"מ'
          onChange={v => update('distanceNoPenaltyKm', v)}
        />
        <SettingField
          label="מחלק הפחתת מרחק"
          description="הפחתה = מרחק חלקי מספר זה (2 = חצי מהמרחק)"
          value={settings.distancePenaltyDivisor}
          defaultValue={DEFAULT_SETTINGS.distancePenaltyDivisor}
          min={1} max={10} step={0.5}
          onChange={v => update('distancePenaltyDivisor', v)}
        />
        <SettingField
          label='מרחק מקסימלי (ק"מ)'
          description="מעל מרחק זה לא תיווצר התאמה כלל"
          value={settings.maxDistanceKm}
          defaultValue={DEFAULT_SETTINGS.maxDistanceKm}
          min={50} max={500}
          suffix=' ק"מ'
          onChange={v => update('maxDistanceKm', v)}
        />
      </div>

      {/* Matching Section */}
      <div className="settings-section">
        <h3><Users size={18} /> התאמות</h3>
        <p className="section-description">פרמטרים כלליים של אלגוריתם ההתאמה</p>

        <SettingField
          label="התאמות לכל חייל"
          description="כמה מתנדבים מוצעים לכל חייל"
          value={settings.matchesPerSoldier}
          defaultValue={DEFAULT_SETTINGS.matchesPerSoldier}
          min={1} max={5}
          onChange={v => update('matchesPerSoldier', v)}
        />
        <SettingField
          label="ציון סופי מינימלי"
          description="הציון הנמוך ביותר האפשרי (רצפה)"
          value={settings.minFinalScore}
          defaultValue={DEFAULT_SETTINGS.minFinalScore}
          min={0} max={30}
          onChange={v => update('minFinalScore', v)}
        />
      </div>

      {/* Quality Thresholds Section */}
      <div className="settings-section">
        <h3><BarChart3 size={18} /> סיפי איכות</h3>
        <p className="section-description">ערכי הסף לסיווג איכות ההתאמה בדוחות</p>

        <SettingField
          label="סף ציון גבוה"
          description="מעל ערך זה ההתאמה נחשבת איכותית"
          value={settings.highScoreThreshold}
          defaultValue={DEFAULT_SETTINGS.highScoreThreshold}
          min={50} max={100}
          onChange={v => update('highScoreThreshold', v)}
        />
        <SettingField
          label="סף ציון בינוני"
          description="מעל ערך זה ההתאמה נחשבת בינונית, מתחתיו נמוכה"
          value={settings.mediumScoreThreshold}
          defaultValue={DEFAULT_SETTINGS.mediumScoreThreshold}
          min={10} max={70}
          onChange={v => update('mediumScoreThreshold', v)}
        />
      </div>

      {/* Live Preview */}
      <div className="settings-section settings-preview">
        <h3>תצוגה מקדימה</h3>
        <div className="preview-table">
          <table>
            <thead>
              <tr>
                <th>מגדר</th>
                <th>שפה</th>
                <th>מרחק 0 ק"מ</th>
                <th>מרחק 20 ק"מ</th>
                <th>מרחק 50 ק"מ</th>
                <th>מרחק 100 ק"מ</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: ['✅', '✅'], base: settings.baseScoreFull },
                { label: ['❌', '✅'], base: settings.baseScoreLanguageOnly },
                { label: ['✅', '❌'], base: settings.baseScoreGenderOnly },
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row.label[0]}</td>
                  <td>{row.label[1]}</td>
                  {[0, 20, 50, 100].map(dist => {
                    const penalty = dist <= settings.distanceNoPenaltyKm
                      ? 0
                      : Math.round(dist / settings.distancePenaltyDivisor);
                    const score = Math.max(settings.minFinalScore, row.base - penalty);
                    return <td key={dist}>{score}</td>;
                  })}
                </tr>
              ))}
              <tr className="no-match-row">
                <td>❌</td>
                <td>❌</td>
                <td colSpan={4}>אין התאמה</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
