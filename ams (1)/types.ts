
export interface Student {
  id: number;
  roll_no: number;
  name: string;
  email?: string;
  status?: 'active' | 'blocked';
}

export interface Faculty {
  id: number;
  roll_no: number;
  name: string;
  status?: 'active' | 'blocked';
}

export interface Lecture {
  id: number;
  name: string;
  default_start_time?: string;
  default_end_time?: string;
}

export interface AttendanceRecord {
  id: number;
  date: string;
  day: string;
  time_slot: string;
  start_time: string;
  end_time: string;
  lecture_name: string;
  lecture_type: string;
  faculty_name: string;
  is_proxy: boolean;
  original_faculty_name: string;
  present_count: number;
  total_count: number;
  created_at: string;
  created_by: string;
  session_token?: string; // For QR validation
  is_active?: boolean; // If QR scanning is currently allowed
  attendance_details?: AttendanceDetail[];
}

export interface AttendanceDetail {
  id?: number;
  student_roll: number;
  student_name: string;
  status: 'P' | 'A';
  attendance_record_id?: number;
  timestamp?: string;
  device_id?: string;
}

export interface UserProfile {
  id: string;
  role: 'admin' | 'faculty' | 'student';
  full_name?: string;
  email?: string;
  roll_no?: number; // Important for students
  status?: 'active' | 'blocked';
  created_at?: string;
  last_login?: string;
  last_active_at?: string;
}

export interface ReviewTask {
  id: string;
  record_id: number;
  assigned_by: string; // User ID
  assigned_to: string; // User ID
  assignee_name?: string; // Display name cache
  creator_name?: string; // Display name cache
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  description: string;
  created_at: string;
  updated_at?: string;
  record_summary?: string; // Cache for UI (e.g., "Maths - 12/10")
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'update' | 'error';
}

export interface QRPayload {
  record_id: number;
  token: string;
  lecture: string;
  faculty: string;
  generated_at: number;
}

export type SortOption = 'roll-asc' | 'roll-desc' | 'name-asc' | 'present' | 'absent';
