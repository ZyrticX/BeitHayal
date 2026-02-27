-- ===========================================
-- Supabase Schema - SECURE VERSION
-- רק מזהים ונתוני התאמה - ללא מידע אישי!
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Students Table (מתנדבים/סטודנטים)
-- רק נתונים הנדרשים להתאמה - ללא שמות/טלפונים/מיילים
-- ===========================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- מזהה חיצוני (מ-Salesforce) - זה המפתח הזר לטבלה המקומית
    external_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- נתונים להתאמה בלבד (לא מזהים אישית)
    gender VARCHAR(10), -- מין (זכר/נקבה)
    city_code VARCHAR(20), -- קוד עיר (לא שם מלא)
    region VARCHAR(20), -- אזור גיאוגרפי (צפון/מרכז/דרום)
    mother_tongue_code VARCHAR(10), -- קוד שפה (HE/RU/EN/UK וכו')
    
    -- נתוני קיבולת
    current_soldiers_count INT DEFAULT 0,
    is_scholarship_active BOOLEAN DEFAULT FALSE,
    max_soldiers INT GENERATED ALWAYS AS (
        CASE WHEN is_scholarship_active THEN 2 ELSE 4 END
    ) STORED,
    available_slots INT GENERATED ALWAYS AS (
        CASE 
            WHEN is_scholarship_active THEN GREATEST(2 - current_soldiers_count, 0)
            ELSE GREATEST(4 - current_soldiers_count, 0)
        END
    ) STORED,
    
    -- סטטוס
    status VARCHAR(20) DEFAULT 'waiting', -- waiting/matched/inactive
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===========================================
-- Soldiers Table (חיילים)
-- רק נתונים להתאמה - ללא מידע אישי
-- ===========================================
CREATE TABLE soldiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- מזהה חיצוני (מ-Salesforce)
    external_id VARCHAR(50) UNIQUE NOT NULL,
    
    -- נתונים להתאמה בלבד
    gender VARCHAR(10),
    city_code VARCHAR(20),
    region VARCHAR(20),
    mother_tongue_code VARCHAR(10),
    language_preference_code VARCHAR(10),
    volunteer_gender_preference VARCHAR(20), -- male/female/any
    
    -- סטטוס
    status VARCHAR(20) DEFAULT 'waiting', -- waiting/matched/inactive
    
    -- דגלים לבקשות מיוחדות (בלי הטקסט עצמו)
    has_special_requests BOOLEAN DEFAULT FALSE,
    special_request_flags JSONB, -- {"gender_specific": true, "language_specific": false}
    
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
    
    -- נתוני התאמה
    confidence_score INT CHECK (confidence_score >= 0 AND confidence_score <= 100),
    match_rank INT DEFAULT 1,
    
    -- סיבות התאמה (קודים, לא טקסט חופשי)
    match_criteria JSONB, -- {"language": true, "distance": 85, "gender_pref": true}
    
    -- סטטוס
    status VARCHAR(20) DEFAULT 'suggested',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(student_id, soldier_id)
);

-- ===========================================
-- City Codes Lookup (טבלת קודי ערים)
-- ===========================================
CREATE TABLE city_codes (
    code VARCHAR(20) PRIMARY KEY,
    region VARCHAR(20), -- north/center/south/jerusalem
    lat DECIMAL(10,6),
    lng DECIMAL(10,6)
);

-- ===========================================
-- Language Codes Lookup (טבלת קודי שפות)
-- ===========================================
CREATE TABLE language_codes (
    code VARCHAR(10) PRIMARY KEY,
    name_he VARCHAR(50),
    name_en VARCHAR(50)
);

-- Insert language codes
INSERT INTO language_codes (code, name_he, name_en) VALUES
('HE', 'עברית', 'Hebrew'),
('EN', 'אנגלית', 'English'),
('RU', 'רוסית', 'Russian'),
('UK', 'אוקראינית', 'Ukrainian'),
('FR', 'צרפתית', 'French'),
('ES', 'ספרדית', 'Spanish'),
('AR', 'ערבית', 'Arabic'),
('AM', 'אמהרית', 'Amharic'),
('FA', 'פרסית', 'Persian'),
('DE', 'גרמנית', 'German'),
('IT', 'איטלקית', 'Italian'),
('PT', 'פורטוגזית', 'Portuguese'),
('ZH', 'סינית', 'Chinese'),
('JA', 'יפנית', 'Japanese');

-- ===========================================
-- Indexes
-- ===========================================
CREATE INDEX idx_students_lang ON students(mother_tongue_code);
CREATE INDEX idx_students_region ON students(region);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_available ON students(available_slots) WHERE available_slots > 0;

CREATE INDEX idx_soldiers_lang ON soldiers(mother_tongue_code);
CREATE INDEX idx_soldiers_region ON soldiers(region);
CREATE INDEX idx_soldiers_status ON soldiers(status);

CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_score ON matches(confidence_score DESC);

-- ===========================================
-- Row Level Security
-- ===========================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE soldiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users only
CREATE POLICY "Auth read students" ON students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write students" ON students FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth read soldiers" ON soldiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write soldiers" ON soldiers FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth read matches" ON matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth write matches" ON matches FOR ALL TO authenticated USING (true);

CREATE POLICY "Auth read city_codes" ON city_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth read language_codes" ON language_codes FOR SELECT TO authenticated USING (true);

-- ===========================================
-- NO ANONYMOUS ACCESS IN PRODUCTION!
-- ===========================================
