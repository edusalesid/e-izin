'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthSession, Student, Permission, UserAccount } from '@/lib/types';
import { toast } from 'sonner';
import { registerPushSubscription } from '@/lib/notifications';

export interface StaffContextType {
  session: AuthSession | null;
  students: Student[];
  permissions: Permission[];
  users: UserAccount[];
  isLoading: boolean;
  refreshData: (silent?: boolean) => Promise<void>;
  logout: () => void;
}

export const StaffContext = createContext<StaffContextType>({
  session: null,
  students: [],
  permissions: [],
  users: [],
  isLoading: true,
  refreshData: async () => {},
  logout: () => {},
});

export function useStaff() {
  return useContext(StaffContext);
}

const SESSION_KEY = 'e_izin_session_v1';
const STAFF_SESSION_KEY = 'e_izin_session_staff_v1';

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load session from localStorage
  useEffect(() => {
    try {
      const savedStaff = localStorage.getItem(STAFF_SESSION_KEY);
      if (savedStaff) {
        setSession(JSON.parse(savedStaff));
        return;
      }
      const savedUnified = localStorage.getItem(SESSION_KEY);
      if (savedUnified) {
        setSession(JSON.parse(savedUnified));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const refreshData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [resStudents, resPerms, resUsers] = await Promise.all([
        fetch('/api/students').then((r) => r.json()).catch(() => ({})),
        fetch('/api/permissions').then((r) => r.json()).catch(() => ({})),
        fetch('/api/users').then((r) => r.json()).catch(() => ({})),
      ]);

      if (resStudents?.students) setStudents(resStudents.students);
      if (resPerms?.permissions) setPermissions(resPerms.permissions);
      if (resUsers?.users) setUsers(resUsers.users);
    } catch (e) {
      console.error('Failed to fetch staff data', e);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // 1. Initial Load & Pendaftaran Push Notification jika sesi aktif
  useEffect(() => {
    refreshData(false);
    if (session) {
      registerPushSubscription({
        userId: session.user?.id || session.user?.username,
        role: session.role,
      }).catch(() => {});
    }
  }, [refreshData, session]);

  // 2. Realtime Synchronizer: Smart Polling, Focus/Visibility Change, & Service Worker Broadcast
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    const pollInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refreshData(true);
      }
    }, 15000);

    const handleSwMessage = (event: MessageEvent) => {
      if (event.data?.type === 'REALTIME_DATA_UPDATE') {
        refreshData(true);
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
  }, [refreshData]);

  const logout = useCallback(() => {
    setSession(null);
    try {
      localStorage.removeItem(STAFF_SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    toast.info('Berhasil Keluar', {
      description: 'Sesi akun petugas telah diakhiri.',
    });
  }, []);

  return (
    <StaffContext.Provider
      value={{
        session,
        students,
        permissions,
        users,
        isLoading,
        refreshData,
        logout,
      }}
    >
      {children}
    </StaffContext.Provider>
  );
}
