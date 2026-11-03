import { Student, Classroom, UserAccount, Permission, PermissionLog, PermissionStatus } from './types';
import { INITIAL_STUDENTS, INITIAL_CLASSROOMS, INITIAL_USERS, INITIAL_PERMISSIONS } from './seed-data';
import { calculateLateMinutes } from './utils';

// Global store cache for fast Next.js API operations
class DataStore {
  private students: Student[] = [...INITIAL_STUDENTS];
  private classrooms: Classroom[] = [...INITIAL_CLASSROOMS];
  private users: UserAccount[] = [...INITIAL_USERS];
  private permissions: Permission[] = [...INITIAL_PERMISSIONS];
  private logs: PermissionLog[] = [];

  // Students
  public getStudents(): Student[] {
    return this.students;
  }

  public getStudentById(id: string): Student | undefined {
    return this.students.find((s) => s.id === id);
  }

  public getStudentByNis(nis: string): Student | undefined {
    return this.students.find((s) => s.nis.trim() === nis.trim());
  }

  public addOrUpdateStudents(newStudents: Student[]) {
    for (const ns of newStudents) {
      const idx = this.students.findIndex((s) => s.nis === ns.nis);
      if (idx >= 0) {
        this.students[idx] = { ...this.students[idx], ...ns };
      } else {
        this.students.push(ns);
      }
    }
  }

  // Classrooms
  public getClassrooms(): Classroom[] {
    return this.classrooms;
  }

  // Users
  public getUsers(): UserAccount[] {
    return this.users;
  }

  public getUserById(id: string): UserAccount | undefined {
    return this.users.find((u) => u.id === id);
  }

  public getUserByUsername(username: string): UserAccount | undefined {
    return this.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  }

  // Permissions
  public getPermissions(): Permission[] {
    // Sort by createdAt descending
    return [...this.permissions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getPermissionById(id: string): Permission | undefined {
    return this.permissions.find((p) => p.id === id);
  }

  public createPermission(newPerm: Omit<Permission, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Permission {
    const perm: Permission = {
      ...newPerm,
      id: `perm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      status: 'PENDING_WALI_KELAS',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.permissions.unshift(perm);

    this.addLog({
      permissionId: perm.id,
      action: 'SUBMITTED',
      actorName: perm.applicantName,
      actorRole: perm.applicantType === 'ORANG_TUA' ? 'ORANG_TUA' : 'USTADZ_UMUM',
      note: `Pengajuan izin baru diajukan (${perm.category === 'KELUAR_SEBENTAR' ? 'Keluar Sebentar' : 'Pulang Menginap'})${perm.targetApproverName ? ' ditujukan ke: ' + perm.targetApproverName : ''}`,
    });

    return perm;
  }

  public updatePermissionStatus(
    id: string,
    update: {
      status: PermissionStatus;
      actorName: string;
      actorRole: UserAccount['role'] | 'ORANG_TUA';
      actorId?: string;
      rejectionReason?: string;
      actualDeparture?: string;
      actualReturn?: string;
      note?: string;
    }
  ): Permission | undefined {
    const perm = this.getPermissionById(id);
    if (!perm) return undefined;

    perm.status = update.status;
    perm.updatedAt = new Date().toISOString();

    if (update.status === 'APPROVED_WALI_KELAS') {
      perm.approvedById = update.actorId;
      perm.approvedByName = update.actorName;
      perm.approvedAt = new Date().toISOString();
      this.addLog({
        permissionId: perm.id,
        action: 'APPROVED',
        actorName: update.actorName,
        actorRole: update.actorRole as any,
        note: update.note || 'Disetujui oleh Wali Kelas. Menunggu verifikasi gerbang Satpam.',
      });
    } else if (update.status === 'REJECTED') {
      perm.rejectionReason = update.rejectionReason || 'Tidak disetujui';
      this.addLog({
        permissionId: perm.id,
        action: 'REJECTED',
        actorName: update.actorName,
        actorRole: update.actorRole as any,
        note: `Pengajuan ditolak. Alasan: ${perm.rejectionReason}`,
      });
    } else if (update.status === 'SEDANG_DI_LUAR') {
      perm.actualDeparture = update.actualDeparture || new Date().toISOString();
      perm.satpamDepartureId = update.actorId;
      perm.satpamDepartureName = update.actorName;
      this.addLog({
        permissionId: perm.id,
        action: 'CHECK_OUT',
        actorName: update.actorName,
        actorRole: 'SATPAM',
        note: 'Santri telah keluar melewati gerbang pos keamanan.',
      });
    } else if (update.status === 'KEMBALI_TEPAT_WAKTU' || update.status === 'KEMBALI_TERLAMBAT') {
      const returnTime = update.actualReturn || new Date().toISOString();
      perm.actualReturn = returnTime;
      perm.satpamReturnId = update.actorId;
      perm.satpamReturnName = update.actorName;

      const lateMins = calculateLateMinutes(perm.plannedReturn, returnTime);
      perm.lateDurationMinutes = lateMins;
      if (lateMins > 0) {
        perm.status = 'KEMBALI_TERLAMBAT';
      } else {
        perm.status = 'KEMBALI_TEPAT_WAKTU';
      }

      this.addLog({
        permissionId: perm.id,
        action: 'CHECK_IN',
        actorName: update.actorName,
        actorRole: 'SATPAM',
        note: perm.lateDurationMinutes > 0
          ? `Santri kembali ke pondok dengan keterlambatan ${perm.lateDurationMinutes} menit.`
          : 'Santri kembali tepat waktu di pos keamanan.',
      });
    }

    return perm;
  }

  // Logs
  public addLog(log: Omit<PermissionLog, 'id' | 'timestamp'>) {
    this.logs.unshift({
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
    });
  }

  public getLogs(permissionId: string): PermissionLog[] {
    return this.logs.filter((l) => l.permissionId === permissionId);
  }
}

// Global singleton to prevent memory reset across HMR in development
const globalForStore = globalThis as unknown as { appDataStore: DataStore };
export const store = globalForStore.appDataStore || new DataStore();
if (process.env.NODE_ENV !== 'production') globalForStore.appDataStore = store;
