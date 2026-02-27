-- ===========================================
-- Supabase Schema for Student-Soldier Matching System
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Students Table (מתנדבים/סטודנטים)
-- ===========================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id VARCHAR(50) UNIQUE NOT NULL, -- מזהה איש קשר
    gender VARCHAR(10), -- מין (זכר/נקבה)
    coordinator VARCHAR(100), -- רכז
    city VARCHAR(100), -- עיר
    origin_country VARCHAR(100), -- ארץ מוצא
    languages TEXT, -- שפות
    volunteering_start_date DATE, -- תאריך התחלת התנדבות
    mother_tongue VARCHAR(50), -- שפת אם
    current_soldiers_count INT DEFAULT 0, -- כמות חיילים
    status_notes TEXT, -- הערות לסטטוס
    project_affiliation VARCHAR(100), -- שיכות לפרויקט
    is_scholarship_active BOOLEAN DEFAULT FALSE, -- האם פעיל במלגה
    residence_city VARCHAR(100), -- עיר מגורים
    volunteer_status VARCHAR(50), -- סטטוס מתנדב/ת
    max_soldiers INT GENERATED ALWAYS AS (
        CASE WHEN is_scholarship_active THEN 2 ELSE 4 END
    ) STORED, -- מקסימום חיילים
    available_slots INT GENERATED ALWAYS AS (
        CASE 
            WHEN is_scholarship_active THEN GREATEST(2 - current_soldiers_count, 0)
            ELSE GREATEST(4 - current_soldiers_count, 0)
        END
    ) STORED, -- מקומות פנויים
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Soldiers Table (חיילים)
-- ===========================================
CREATE TABLE soldiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id VARCHAR(50) UNIQUE NOT NULL, -- מזהה איש קשר
    gender VARCHAR(10), -- מין
    residence_city VARCHAR(100), -- עיר מגורים
    city VARCHAR(100), -- עיר
    origin_country VARCHAR(100), -- ארץ מוצא
    mother_tongue VARCHAR(50), -- שפת אם
    arrival_method VARCHAR(100), -- כיצד הגיע לעמותה
    status_notes TEXT, -- הערות לסטטוס
    special_requests TEXT, -- בקשות מיוחדות בזמן בקשה לשיבוץ
    project_affiliation VARCHAR(100), -- שיכות לפרויקט
    military_branch VARCHAR(100), -- חיל
    service_location VARCHAR(100), -- מקום שירות
    enlistment_date DATE, -- תאריך גיוס
    discharge_date DATE, -- תאריך שחרור
    unit_role VARCHAR(100), -- תפקיד ביחידה
    language_preference VARCHAR(50), -- העדפת שפה
    volunteer_gender_preference VARCHAR(20), -- מתנדב או מתנדבת
    belongs_to_patrol BOOLEAN DEFAULT FALSE, -- שייך לסיירת
    is_soldiers_club BOOLEAN DEFAULT FALSE, -- האם מועדון חיילים
    contact_type VARCHAR(50), -- סוג איש קשר
    district_coordinator VARCHAR(100), -- רכז מחוז
    participation_interest DECIMAL(3,1), -- עד כמה אני רוצה להשתתף באח גדול
    soldier_status VARCHAR(50), -- סטטוס חייל
    current_volunteer_id UUID REFERENCES students(id), -- מתנדב/ת אחראי/ת נוכחי
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Matches Table (התאמות)
-- ===========================================
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    soldier_id UUID NOT NULL REFERENCES soldiers(id) ON DELETE CASCADE,
    confidence_score INT CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_rank INT DEFAULT 1, -- 1 = primary, 2 = secondary option
    match_reasons JSONB, -- סיבות להתאמה
    status VARCHAR(20) DEFAULT 'suggested', -- suggested, approved, rejected
    created_by UUID,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, soldier_id)
);

-- ===========================================
-- Cities Distance Cache (מרחקים בין ערים)
-- ===========================================
CREATE TABLE city_distances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city1 VARCHAR(100) NOT NULL,
    city2 VARCHAR(100) NOT NULL,
    distance_km DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(city1, city2)
);

-- ===========================================
-- Audit Log (לוג פעולות)
-- ===========================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
    old_data JSONB,
    new_data JSONB,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Indexes for Performance
-- ===========================================
CREATE INDEX idx_students_mother_tongue ON students(mother_tongue);
CREATE INDEX idx_students_city ON students(city);
CREATE INDEX idx_students_status ON students(volunteer_status);
CREATE INDEX idx_students_available ON students(available_slots) WHERE available_slots > 0;

CREATE INDEX idx_soldiers_mother_tongue ON soldiers(mother_tongue);
CREATE INDEX idx_soldiers_city ON soldiers(city);
CREATE INDEX idx_soldiers_status ON soldiers(soldier_status);
CREATE INDEX idx_soldiers_volunteer_pref ON soldiers(volunteer_gender_preference);

CREATE INDEX idx_matches_student ON matches(student_id);
CREATE INDEX idx_matches_soldier ON matches(soldier_id);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_score ON matches(confidence_score DESC);

CREATE INDEX idx_city_distances_cities ON city_distances(city1, city2);

-- ===========================================
-- Updated At Trigger
-- ===========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soldiers_updated_at
    BEFORE UPDATE ON soldiers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Row Level Security (RLS)
-- ===========================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_distances ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Allow authenticated read" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON soldiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON city_distances FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to insert/update
CREATE POLICY "Allow authenticated insert" ON students FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON students FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON soldiers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON soldiers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert" ON city_distances FOR INSERT TO authenticated WITH CHECK (true);

-- For development: Allow anonymous access (remove in production)
CREATE POLICY "Allow anon read students" ON students FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read soldiers" ON soldiers FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read matches" ON matches FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read city_distances" ON city_distances FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert students" ON students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert soldiers" ON soldiers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert matches" ON matches FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon insert city_distances" ON city_distances FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update students" ON students FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon update soldiers" ON soldiers FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon update matches" ON matches FOR UPDATE TO anon USING (true);
