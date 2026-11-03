export type UserRole = 
  | 'ORANG_TUA' 
  | 'USTADZ_UMUM' 
  | 'WALI_KELAS' 
  | 'KEPALA_ASRAMA' 
  | 'SATPAM'
  | 'SUPER_ADMIN';

export type PermissionCategory = 
  | 'KELUAR_SEBENTAR' 
  | 'PULANG_MENGINAP'
  | 'PESIAR';

export type EscortType = 
  | 'ORANG_TUA' 
  | 'MANDIRI' 
  | 'OJEK_TRAVEL' 
  | 'SAUDARA' 
  | 'LAINNYA';

export type PermissionStatus = 
  | 'PENDING_WALI_KELAS' 
  | 'APPROVED_WALI_KELAS' 
  | 'REJECTED' 
  | 'SEDANG_DI_LUAR' 
  | 'KEMBALI_TEPAT_WAKTU' 
  | 'KEMBALI_TERLAMBAT';

export interface LateFineSettings {
  mode: 'PER_JAM' | 'FLAT';
  ratePerUnit: number;
  gracePeriodMinutes: number;
  maxFineAmount: number;
}

export interface Student {
  id: string;
  nis: string;
  fullName: string;
  gender: 'L' | 'P';
  classroomId: string;
  className: string;
  dormitory: string; // Asrama/Kamar
  parentName: string;
  parentPhone: string;
  classroom?: Classroom;
}

export interface Classroom {
  id: string;
  name: string; // e.g. "X IPA 1", "XI IPS 2", "XII MIPA"
  waliKelasId: string;
  waliKelasName: string;
  waliKelasPhone: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  phone?: string;
  pin?: string;
  classroomId?: string; // For Wali Kelas
}

export interface AuthSession {
  role: UserRole;
  user?: UserAccount;
  student?: Student;
  token?: string;
  loginTime: string;
}

export interface Permission {
  id: string;
  studentId: string;
  studentName: string;
  studentNis: string;
  className: string;
  dormitory: string;
  
  category: PermissionCategory;
  reason: string;
  
  applicantType: 'ORANG_TUA' | 'USTADZ';
  applicantId?: string;
  applicantName: string;
  applicantPhone: string;

  targetApproverId?: string;
  targetApproverName?: string;
  
  escortType: EscortType;
  escortNote?: string;
  attachmentUrl?: string;
  
  plannedDeparture: string; // ISO string
  plannedReturn: string;    // ISO string
  actualDeparture?: string; // ISO string when satpam checks out
  actualReturn?: string;    // ISO string when satpam checks in
  
  status: PermissionStatus;
  rejectionReason?: string;
  
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  
  satpamDepartureId?: string;
  satpamDepartureName?: string;
  
  satpamReturnId?: string;
  satpamReturnName?: string;
  
  lateDurationMinutes?: number;
  lateFineAmount?: number;
  lateFineStatus?: 'UNPAID' | 'PAID';
  
  createdAt: string;
  updatedAt: string;
}

export interface PermissionLog {
  id: string;
  permissionId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHECK_OUT' | 'CHECK_IN';
  actorName: string;
  actorRole: UserRole;
  note?: string;
  timestamp: string;
}

export interface PesiarSchedule {
  id: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  returnTime: string; // HH:mm
  isActive: boolean;
  description?: string;
  createdById?: string;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LateFineSettings {
  mode: 'PER_JAM' | 'FLAT';
  ratePerUnit: number;
  gracePeriodMinutes: number;
  maxFineAmount: number;
}
