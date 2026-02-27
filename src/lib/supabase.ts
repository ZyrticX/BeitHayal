import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Types
export interface Student {
  id: string;
  contact_id: string;
  gender: string | null;
  coordinator: string | null;
  city: string | null;
  origin_country: string | null;
  languages: string | null;
  volunteering_start_date: string | null;
  mother_tongue: string | null;
  current_soldiers_count: number;
  status_notes: string | null;
  project_affiliation: string | null;
  is_scholarship_active: boolean;
  residence_city: string | null;
  volunteer_status: string | null;
  max_soldiers: number;
  available_slots: number;
  created_at: string;
  updated_at: string;
}

export interface Soldier {
  id: string;
  contact_id: string;
  gender: string | null;
  residence_city: string | null;
  city: string | null;
  origin_country: string | null;
  mother_tongue: string | null;
  arrival_method: string | null;
  status_notes: string | null;
  special_requests: string | null;
  project_affiliation: string | null;
  military_branch: string | null;
  service_location: string | null;
  enlistment_date: string | null;
  discharge_date: string | null;
  unit_role: string | null;
  language_preference: string | null;
  volunteer_gender_preference: string | null;
  belongs_to_patrol: boolean;
  is_soldiers_club: boolean;
  contact_type: string | null;
  district_coordinator: string | null;
  participation_interest: number | null;
  soldier_status: string | null;
  current_volunteer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  student_id: string;
  soldier_id: string;
  confidence_score: number;
  match_rank: number;
  match_reasons: MatchReasons;
  status: 'suggested' | 'approved' | 'rejected';
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  student?: Student;
  soldier?: Soldier;
}

export interface MatchReasons {
  language_match: boolean;
  language_score: number;
  city_match: boolean;
  distance_km: number | null;
  gender_preference_match: boolean;
  special_requests_considered: boolean;
  details: string[];
}

export interface CityDistance {
  city1: string;
  city2: string;
  distance_km: number;
}
