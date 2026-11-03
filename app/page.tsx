'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from '@/components/Navbar';
import { BottomNav, TabKey } from '@/components/BottomNav';
import { GeneralLoginView } from '@/components/GeneralLoginView';
import { InstallPwaModal } from '@/components/InstallPwaModal';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { AuthSession, Student, Permission, UserAccount, UserRole, Classroom } from '@/lib/types';
import { ParentPortalView } from '@/components/views/ParentPortalView';
import { WaliKelasView } from '@/components/views/WaliKelasView';
import { SatpamView } from '@/components/views/SatpamView';
import { KepalaAsramaView } from '@/components/views/KepalaAsramaView';
import { UstadzView } from '@/components/views/UstadzView';
import { ProfileView } from '@/components/views/ProfileView';
import { CreatePermissionDrawer } from '@/components/drawers/CreatePermissionDrawer';
import { ReturnStudentDrawer } from '@/components/drawers/ReturnStudentDrawer';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  sendPwaNotification,
  requestNotificationPermission,
  registerPushSubscription,
  ensurePushSubscriptionSynced,
  checkAndTriggerPermissionNotifications,
  markLocalPermissionAction,
} from '@/lib/notifications';
import { FullPortalPageSkeleton, PortalDashboardSkeleton } from '@/components/skeletons/AppSkeletons';

const SESSION_KEY = 'e_izin_session_v1';
const PARENT_SESSION_KEY = 'e_izin_session_parent_v1';
const STAFF_SESSION_KEY = 'e_izin_session_staff_v1';

export default function UnifiedMainPortalPage() {
  const { isInstalled, isIOS, install } = usePWAInstall();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAjukanDrawerOpen, setIsAjukanDrawerOpen] = useState(false);
  const [isReturnDrawerOpen, setIsReturnDrawerOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Session & Auth state
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  // Navigation tab for the active role portal
  const [activeTab, setActiveTab] = useState<TabKey>('STATUS');

  // App data from PostgreSQL Neon
  const [students, setStudents] = useState<Student[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Default tab helper based on role
  const getDefaultTabForRole = (role: UserRole): TabKey => {
    switch (role) {
      case 'ORANG_TUA':
        return 'STATUS';
      case 'WALI_KELAS':
        return 'KELAS';
      case 'SATPAM':
        return 'GERBANG';
      case 'KEPALA_ASRAMA':
      case 'SUPER_ADMIN':
        return 'APPROVAL';
      case 'USTADZ_UMUM':
      default:
        return 'STATUS';
    }
  };

  // Auto-trigger popup pasang aplikasi dari bawah untuk pengguna yang belum install atau belum izinkan notifikasi
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const isDismissed = sessionStorage.getItem('pwa_bottom_prompt_dismissed');
        const hasNotification = 'Notification' in window && Notification.permission === 'granted';

        if (!isDismissed && (!isInstalled || !hasNotification)) {
          const timer = setTimeout(() => {
            setIsInstallModalOpen(true);
          }, 1200);
          return () => clearTimeout(timer);
        }
      } catch {}
    }
  }, [isInstalled]);

  const handleCloseInstallModal = useCallback(() => {
    try {
      sessionStorage.setItem('pwa_bottom_prompt_dismissed', 'true');
    } catch {}
    setIsInstallModalOpen(false);
  }, []);

  const handleInstallApp = useCallback(async () => {
    try {
      sessionStorage.setItem('pwa_bottom_prompt_dismissed', 'true');
    } catch {}
    await install();
  }, [install]);

  // Load active session from localStorage on mount
  useEffect(() => {
    try {
      const savedUnified = localStorage.getItem(SESSION_KEY);
      if (savedUnified) {
        const parsed: AuthSession = JSON.parse(savedUnified);
        setSession(parsed);
        setActiveTab(getDefaultTabForRole(parsed.role));
        setIsSessionLoaded(true);
        return;
      }

      const savedStaff = localStorage.getItem(STAFF_SESSION_KEY);
      if (savedStaff) {
        const parsed: AuthSession = JSON.parse(savedStaff);
        if (parsed.role && parsed.role !== 'ORANG_TUA') {
          setSession(parsed);
          setActiveTab(getDefaultTabForRole(parsed.role));
          setIsSessionLoaded(true);
          return;
        }
      }

      const savedParent = localStorage.getItem(PARENT_SESSION_KEY);
      if (savedParent) {
        const parsed: AuthSession = JSON.parse(savedParent);
        if (parsed.role === 'ORANG_TUA') {
          setSession(parsed);
          setActiveTab(getDefaultTabForRole('ORANG_TUA'));
          setIsSessionLoaded(true);
          return;
        }
      }
    } catch {
      // Ignore parse errors
    } finally {
      setIsSessionLoaded(true);
    }
  }, []);

  const isInitialLoadedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;
  const studentsRef = useRef<Student[]>([]);
  studentsRef.current = students;
  const prevPermissionsMapRef = useRef<Map<string, string> | null>(null);

  // Fetch all live data from Neon PostgreSQL via API (mendukung silent background update tanpa layout shift)
  const fetchData = useCallback(async (silent = false) => {
    if (silent && isFetchingRef.current) return;
    isFetchingRef.current = true;

    // Hanya aktifkan skeleton saat pertama kali halaman dimuat
    if (!silent && !isInitialLoadedRef.current) {
      setIsLoading(true);
    }
    try {
      const [resStudents, resPerms, resUsers, resClassrooms] = await Promise.all([
        fetch('/api/students', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/permissions', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/users', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
        fetch('/api/classrooms', { cache: 'no-store' }).then((r) => r.json()).catch(() => ({})),
      ]);

      if (resStudents?.students) setStudents(resStudents.students);
      if (resPerms?.permissions) {
        prevPermissionsMapRef.current = checkAndTriggerPermissionNotifications(
          prevPermissionsMapRef.current,
          resPerms.permissions,
          sessionRef.current,
          resStudents?.students || studentsRef.current
        );
        setPermissions(resPerms.permissions);
      }
      if (resClassrooms?.classrooms) setClassrooms(resClassrooms.classrooms);
      if (sessionRef.current) {
        ensurePushSubscriptionSynced({
          userId: sessionRef.current.user?.id || sessionRef.current.user?.username,
          role: sessionRef.current.role,
          studentNis: sessionRef.current.student?.nis,
        }).catch(() => {});
      }
      if (resUsers?.users) {
        setUsers(resUsers.users);
        // Sinkronisasi sesi akun petugas HANYA jika ada data yang benar-benar berubah (mencegah loop)
        setSession((prev) => {
          if (!prev?.user?.id && !prev?.user?.username) return prev;
          const freshUser = resUsers.users.find(
            (u: UserAccount) => u.id === prev.user?.id || u.username === prev.user?.username
          );
          if (freshUser) {
            if (
              prev.role === freshUser.role &&
              prev.user?.name === freshUser.name &&
              prev.user?.phone === freshUser.phone &&
              prev.user?.classroomId === freshUser.classroomId &&
              prev.user?.pin === freshUser.pin
            ) {
              return prev; // Objek sama, tidak memicu re-render
            }
            const updated: AuthSession = {
              ...prev,
              role: freshUser.role,
              user: {
                ...prev.user,
                ...freshUser,
              },
            };
            try {
              localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
              localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(updated));
            } catch {}
            return updated;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setIsLoading(false);
      isInitialLoadedRef.current = true;
      isFetchingRef.current = false;
    }
  }, []);

  // 1. Initial Load hanya 1x saat aplikasi di-mount
  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  // 2. Pendaftaran Web Push Notification terpisah (tidak memicu fetch ulang)
  const sessionUserKey = session?.user?.id || session?.user?.username || session?.student?.nis;
  useEffect(() => {
    if (session) {
      registerPushSubscription({
        userId: session.user?.id || session.user?.username,
        role: session.role,
        studentNis: session.student?.nis,
      }).catch(() => {});
    }
  }, [sessionUserKey, session?.role]);

  // 2. Realtime Synchronizer: Smart Polling, Focus/Visibility Change, & Service Worker Broadcast
  useEffect(() => {
    // A. Auto refresh saat aplikasi kembali dibuka / layar dinyalakan
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // B. Smart background polling setiap 6 detik (tetap aktif meskipun aplikasi di-minimize / tab di latar belakang)
    const pollInterval = setInterval(() => {
      fetchData(true);
    }, 6000);

    // C. Terima sinyal dari Service Worker jika ada Web Push baru masuk
    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REALTIME_DATA_UPDATE') {
        fetchData(true);
      }
    };

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(pollInterval);
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [fetchData]);

  // Login handler
  const handleLoginSuccess = (newSession: AuthSession) => {
    sessionRef.current = newSession;
    prevPermissionsMapRef.current =
      permissions.length > 0 ? new Map(permissions.map((p) => [p.id, p.status])) : null;
    setSession(newSession);
    setActiveTab(getDefaultTabForRole(newSession.role));
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      if (newSession.role === 'ORANG_TUA') {
        localStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(newSession));
      } else {
        localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(newSession));
      }
    } catch {}
    
    const welcomeName =
      newSession.role === 'ORANG_TUA'
        ? (newSession.student?.parentName || 'Wali Santri')
        : (newSession.user?.name || 'Petugas');

    toast.success('Berhasil Masuk', {
      description: `Selamat datang di E-Izin IF, ${welcomeName}.`,
    });

    requestNotificationPermission().catch(() => {});
    registerPushSubscription({
      userId: newSession.user?.id || newSession.user?.username,
      role: newSession.role,
      studentNis: newSession.student?.nis,
    }).catch(() => {});
    fetchData(true);
  };

  // Logout handler
  const handleLogout = () => {
    sessionRef.current = null;
    prevPermissionsMapRef.current = null;
    setSession(null);
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(STAFF_SESSION_KEY);
      localStorage.removeItem(PARENT_SESSION_KEY);
    } catch {}
    toast.info('Berhasil Keluar', {
      description: 'Sesi akun Anda telah diakhiri.',
    });
  };

  // Navigasi cepat ajukan izin santri (Membuka Bottom Drawer)
  const handleOpenAjukan = () => {
    setIsAjukanDrawerOpen(true);
  };

  // Staff workflow actions (Bisa disetujui oleh Wali Kelas, Kepala Asrama, atau Super Admin)
  const handleApprove = async (id: string) => {
    try {
      const isSuperAdmin = session?.role === 'SUPER_ADMIN';
      const isKepalaAsrama = session?.role === 'KEPALA_ASRAMA' || isSuperAdmin;
      const actorTitle = isSuperAdmin ? 'Super Admin' : isKepalaAsrama ? 'Kepala Asrama' : 'Wali Kelas';
      const perm = permissions.find((p) => p.id === id);

      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'APPROVED_WALI_KELAS',
          actorName: session?.user?.name || actorTitle,
          actorRole: session?.role || 'WALI_KELAS',
          actorId: session?.user?.id,
          note: `Disetujui oleh ${actorTitle}: ${session?.user?.name || ''}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menyetujui izin santri');
      }

      markLocalPermissionAction(id, 'APPROVED_WALI_KELAS');

      toast.success('Izin Berhasil Disetujui', {
        description: perm
          ? `Izin untuk ${perm.studentName} telah disetujui oleh ${actorTitle}. Siap keluar gerbang.`
          : `Permohonan izin telah disetujui oleh ${actorTitle}. Santri siap keluar melalui gerbang.`,
      });

      sendPwaNotification('Izin Santri Disetujui', {
        body: `Permohonan izin telah disetujui oleh ${actorTitle} dan siap untuk check-out gerbang.`,
        tag: `perm-status-${id}-APPROVED_WALI_KELAS`,
      });
      fetchData(true);
    } catch (err: any) {
      console.error('Approve failed:', err);
      toast.error('Gagal Menyetujui Izin', {
        description: err?.message || 'Terjadi kesalahan sistem saat menyetujui permohonan.',
      });
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const isSuperAdmin = session?.role === 'SUPER_ADMIN';
      const isKepalaAsrama = session?.role === 'KEPALA_ASRAMA' || isSuperAdmin;
      const actorTitle = isSuperAdmin ? 'Super Admin' : isKepalaAsrama ? 'Kepala Asrama' : 'Wali Kelas';
      const perm = permissions.find((p) => p.id === id);

      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'REJECTED',
          actorName: session?.user?.name || actorTitle,
          actorRole: session?.role || 'WALI_KELAS',
          actorId: session?.user?.id,
          rejectionReason: reason,
          note: `Ditolak oleh ${actorTitle}: ${reason}`,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal menolak izin santri');
      }

      markLocalPermissionAction(id, 'REJECTED');

      toast.error('Izin Berhasil Ditolak', {
        description: perm
          ? `Izin ${perm.studentName} ditolak: ${reason}`
          : `Permohonan izin ditolak: ${reason}`,
      });

      sendPwaNotification('Izin Santri Ditolak', {
        body: `Permohonan izin ditolak: ${reason}`,
        tag: `perm-status-${id}-REJECTED`,
      });
      fetchData(true);
    } catch (err: any) {
      console.error('Reject failed:', err);
      toast.error('Gagal Menolak Izin', {
        description: err?.message || 'Terjadi kesalahan saat memproses penolakan izin.',
      });
    }
  };

  const handleCheckOut = async (id: string) => {
    try {
      const perm = permissions.find((p) => p.id === id);
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'SEDANG_DI_LUAR',
          actorName: session?.user?.name || 'Pos Satpam',
          actorRole: session?.role || 'SATPAM',
          actorId: session?.user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal check-out gerbang');
      }

      markLocalPermissionAction(id, 'SEDANG_DI_LUAR');

      toast.success('Check-out Gerbang Berhasil', {
        description: perm
          ? `Santri ${perm.studentName} telah diverifikasi keluar pos gerbang.`
          : 'Santri telah check-out di pos satpam dan tercatat Sedang Di Luar Pondok.',
      });

      sendPwaNotification('Santri Keluar Gerbang', {
        body: 'Santri telah check-out di pos satpam dan tercatat Sedang Di Luar Pondok.',
        tag: `perm-status-${id}-SEDANG_DI_LUAR`,
      });
      fetchData(true);
    } catch (err: any) {
      console.error('CheckOut failed:', err);
      toast.error('Gagal Check-Out Gerbang', {
        description: err?.message || 'Terjadi kesalahan saat verifikasi gerbang.',
      });
    }
  };

  const handleCheckIn = async (id: string, lateFineStatus?: 'UNPAID' | 'PAID') => {
    try {
      const perm = permissions.find((p) => p.id === id);
      const res = await fetch('/api/permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'KEMBALI_TEPAT_WAKTU',
          lateFineStatus: lateFineStatus || 'UNPAID',
          actorName: session?.user?.name || (session?.role === 'SATPAM' ? 'Pos Satpam' : 'Musyrif Asrama'),
          actorRole: session?.role || 'USTADZ_UMUM',
          actorId: session?.user?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal verifikasi kepulangan santri');
      }

      const resData = await res.json().catch(() => ({}));
      const updated = resData?.permission;
      const finalStatus = updated?.status || 'KEMBALI_TEPAT_WAKTU';
      const isLate = finalStatus === 'KEMBALI_TERLAMBAT';

      markLocalPermissionAction(id, finalStatus);

      if (isLate) {
        toast.warning('Santri Kembali (Terlambat)', {
          description: `Santri ${perm?.studentName || ''} tercatat kembali terlambat (${updated?.lateDurationMinutes || 0} menit).`,
        });
      } else {
        toast.success('Santri Berhasil Kembali', {
          description: `Kepulangan santri ${perm?.studentName || ''} telah diverifikasi oleh ${session?.user?.name || 'Musyrif Asrama'}.`,
        });
      }

      sendPwaNotification('Santri Kembali ke Pondok', {
        body: `Kepulangan santri telah diverifikasi oleh ${session?.user?.name || 'Musyrif Asrama'}.`,
        tag: `perm-status-${id}-${finalStatus}`,
      });
      fetchData(true);
    } catch (err: any) {
      console.error('CheckIn failed:', err);
      toast.error('Gagal Verifikasi Kepulangan', {
        description: err?.message || 'Terjadi kesalahan saat verifikasi santri kembali.',
      });
    }
  };

  // Badge calculations dinamis berdasarkan data relasi database asli (tanpa hardcode nama)
  const pendingCount = permissions.filter((p) => {
    if (session?.role === 'WALI_KELAS') {
      if (p.status !== 'PENDING_WALI_KELAS') return false;
      if (p.targetApproverId && p.targetApproverId === session.user?.id) return true;
      const targetStudent = students.find((s) => s.id === p.studentId || s.nis === p.studentNis);
      if (targetStudent && session.user?.classroomId) {
        return targetStudent.classroomId === session.user.classroomId;
      }
      return true;
    }
    if (session?.role === 'KEPALA_ASRAMA' || session?.role === 'SUPER_ADMIN') {
      return p.status === 'PENDING_WALI_KELAS';
    }
    if (session?.role === 'SATPAM') {
      return p.status === 'APPROVED_WALI_KELAS';
    }
    return p.status === 'PENDING_WALI_KELAS';
  }).length;

  const outsideCount = permissions.filter((p) => p.status === 'SEDANG_DI_LUAR').length;
  const lateCount = permissions.filter(
    (p) => p.status === 'KEMBALI_TERLAMBAT' || (p.status === 'SEDANG_DI_LUAR' && new Date(p.plannedReturn) < new Date())
  ).length;

  if (!isSessionLoaded) {
    return <FullPortalPageSkeleton />;
  }

  // 1. UNCOMMITTED / NOT LOGGED IN -> Show General Login on http://localhost:1000/
  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-between border-x border-zinc-200 bg-zinc-50 shadow-sm relative">
        <GeneralLoginView
          onLoginSuccess={handleLoginSuccess}
          onOpenInstall={() => setIsInstallModalOpen(true)}
          isInstalled={isInstalled}
        />

        <InstallPwaModal
          isOpen={isInstallModalOpen}
          onClose={handleCloseInstallModal}
          onInstall={handleInstallApp}
          isIOS={isIOS}
          isInstalled={isInstalled}
        />
      </div>
    );
  }

  // 2. AUTHENTICATED -> Render Role-Specific Portal View right here on http://localhost:1000/
  const currentStudent =
    session.role === 'ORANG_TUA'
      ? students.find((s) => s.id === session.student?.id || s.nis === session.student?.nis) || session.student || null
      : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col border-x border-zinc-200 bg-zinc-50 shadow-sm relative">
      <Navbar
        onOpenInstall={() => setIsInstallModalOpen(true)}
        isInstalled={isInstalled}
        session={session}
        onLogout={handleLogout}
        onOpenProfile={() => setActiveTab('PROFIL')}
        onOpenAjukan={handleOpenAjukan}
        onOpenReturn={() => setIsReturnDrawerOpen(true)}
        onOpenUploadCsv={() => setIsUploadModalOpen(true)}
        activeTab={activeTab}
        outsideCount={outsideCount}
      />

      <main className="flex-1 p-3.5 pb-24 overflow-y-auto">
        {isLoading ? (
          <PortalDashboardSkeleton role={session.role} />
        ) : activeTab === 'PROFIL' ? (
          /* Halaman Profil Terpadu Per Akun */
          <ProfileView
            session={session}
            student={currentStudent}
            permissions={
              session.role === 'ORANG_TUA'
                ? permissions.filter((p) => p.studentId === currentStudent?.id)
                : permissions
            }
            onLogout={handleLogout}
            onOpenInstall={() => setIsInstallModalOpen(true)}
            isInstalled={isInstalled}
            onProfileUpdated={fetchData}
          />
        ) : (
          <>
            {/* 1. Wali Santri Portal View */}
            {session.role === 'ORANG_TUA' && (
              <ParentPortalView
                activeTab={activeTab}
                student={currentStudent}
                permissions={permissions.filter((p) => p.studentId === currentStudent?.id)}
                onRefresh={fetchData}
                onTabChange={setActiveTab}
                onOpenAjukan={handleOpenAjukan}
              />
            )}

            {/* 2. Wali Kelas Portal View */}
            {session.role === 'WALI_KELAS' && session.user && (
              <WaliKelasView
                activeTab={activeTab}
                currentUser={session.user}
                students={students}
                permissions={permissions}
                users={users}
                classrooms={classrooms}
                onApprove={handleApprove}
                onReject={handleReject}
                onCheckIn={handleCheckIn}
                onOpenReturnDrawer={() => setIsReturnDrawerOpen(true)}
                onRefresh={fetchData}
                onTabChange={setActiveTab}
              />
            )}

            {/* 3. Satpam / Pos Gerbang Portal View */}
            {session.role === 'SATPAM' && session.user && (
              <SatpamView
                activeTab={activeTab}
                currentUser={session.user}
                permissions={permissions}
                onCheckOut={handleCheckOut}
                onCheckIn={handleCheckIn}
                onRefresh={fetchData}
              />
            )}

            {/* 4. Kepala Asrama & Super Admin Portal View */}
            {(session.role === 'KEPALA_ASRAMA' || session.role === 'SUPER_ADMIN') && session.user && (
              <KepalaAsramaView
                activeTab={activeTab}
                currentUser={session.user}
                students={students}
                permissions={permissions}
                onApprove={handleApprove}
                onReject={handleReject}
                onCheckIn={handleCheckIn}
                onRefresh={fetchData}
                onStudentsUpdated={fetchData}
                onTabChange={setActiveTab}
                isUploadModalOpen={isUploadModalOpen}
                setIsUploadModalOpen={setIsUploadModalOpen}
              />
            )}

            {/* 5. Ustadz / Guru Umum Portal View */}
            {session.role === 'USTADZ_UMUM' && session.user && (
              <UstadzView
                activeTab={activeTab}
                currentUser={session.user}
                students={students}
                permissions={permissions}
                onCheckIn={handleCheckIn}
                onOpenReturnDrawer={() => setIsReturnDrawerOpen(true)}
                onRefresh={fetchData}
                onTabChange={setActiveTab}
              />
            )}
          </>
        )}
      </main>

      {/* Role-tailored dynamic navigation with Profile tab */}
      <BottomNav
        activeRole={session.role}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingCount={pendingCount}
        outsideCount={outsideCount}
        lateCount={lateCount}
      />

      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={handleCloseInstallModal}
        onInstall={handleInstallApp}
        isIOS={isIOS}
        isInstalled={isInstalled}
      />

      {/* Drawer Pengajuan Izin Santri: Muncul dari Bawah (Swipe to Dismiss) */}
      {session && (
        <CreatePermissionDrawer
          isOpen={isAjukanDrawerOpen}
          onClose={() => setIsAjukanDrawerOpen(false)}
          students={students}
          preselectedStudent={currentStudent}
          activeRole={session.role}
          currentUser={session.user || null}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}

      {/* Drawer Cek-in Santri Kembali (Pencarian Cepat & Konfirmasi Instan) */}
      {session && (
        <ReturnStudentDrawer
          isOpen={isReturnDrawerOpen}
          onClose={() => setIsReturnDrawerOpen(false)}
          permissions={permissions}
          currentUser={session.user || null}
          activeRole={session.role}
          onCheckIn={async (id) => {
            await handleCheckIn(id);
          }}
        />
      )}
    </div>
  );
}
