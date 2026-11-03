-- Schema for Cloudflare D1 (Serverless SQLite)
-- E-Izin Santri - SMAIT Ihsanul Fikri

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  classroom_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classrooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  wali_kelas_id TEXT NOT NULL,
  wali_kelas_name TEXT NOT NULL,
  wali_kelas_phone TEXT,
  FOREIGN KEY (wali_kelas_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  nis TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  classroom_id TEXT NOT NULL,
  class_name TEXT NOT NULL,
  dormitory TEXT DEFAULT '',
  parent_name TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (classroom_id) REFERENCES classrooms(id)
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  student_nis TEXT NOT NULL,
  class_name TEXT NOT NULL,
  dormitory TEXT DEFAULT '',
  
  category TEXT NOT NULL, -- 'KELUAR_SEBENTAR' | 'PULANG_MENGINAP'
  reason TEXT NOT NULL,
  
  applicant_type TEXT NOT NULL, -- 'ORANG_TUA' | 'USTADZ'
  applicant_id TEXT,
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  
  escort_type TEXT NOT NULL,
  escort_note TEXT,
  attachment_url TEXT,
  
  planned_departure TEXT NOT NULL,
  planned_return TEXT NOT NULL,
  actual_departure TEXT,
  actual_return TEXT,
  
  status TEXT NOT NULL,
  rejection_reason TEXT,
  
  approved_by_id TEXT,
  approved_by_name TEXT,
  approved_at TEXT,
  
  satpam_departure_id TEXT,
  satpam_departure_name TEXT,
  
  satpam_return_id TEXT,
  satpam_return_name TEXT,
  
  late_duration_minutes INTEGER DEFAULT 0,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS permission_logs (
  id TEXT PRIMARY KEY,
  permission_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  note TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (permission_id) REFERENCES permissions(id)
);
