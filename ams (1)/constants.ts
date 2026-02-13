
import { createClient } from '@supabase/supabase-js';

// Configuration from your original code
export const SUPABASE_URL = "https://hunnkdhhacqwhpqxovte.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1bm5rZGhoYWNxd2hwcXhvdnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MTI4MzIsImV4cCI6MjA3OTQ4ODgzMn0.MAGBD6youFiHbCVxCd_3sD4DMidEuVBFaoncj1RLxGk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const ADMIN_SETTINGS_KEY = 'panel_visibility';
export const ADMIN_TABLE = 'admin_settings';

export const PANEL_KEYS = {
  REPORTS: 'attendanceReportsPanel',
  REGULAR_SUMMARY: 'regularStudentsWrap',
  HEATBAR: 'heatbarWrap',
  MONTHLY_HEATMAP: 'monthlyHeatWrap',
  RECORDS: 'attendanceRecordsPanel',
  ANALYTICS: 'analyticsPanel',
  FACULTY_REPORTS: 'facultyReportsPanel',
};

export const DEFAULT_PANEL_VISIBILITY = {
  [PANEL_KEYS.REPORTS]: false,
  [PANEL_KEYS.REGULAR_SUMMARY]: false,
  [PANEL_KEYS.HEATBAR]: false,
  [PANEL_KEYS.MONTHLY_HEATMAP]: false,
  [PANEL_KEYS.RECORDS]: false,
  [PANEL_KEYS.ANALYTICS]: false,
  [PANEL_KEYS.FACULTY_REPORTS]: false,
};
