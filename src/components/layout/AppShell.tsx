'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours idle timeout for Owner

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLandingPage = pathname === '/';
  const isLoginPage = pathname === '/login';
  const isPelangganRoute = pathname.startsWith('/pelanggan');

  // Logout on session timeout (Owner POS idle timeout)
  const handleTimeoutLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    router.push('/login?error=timeout');
  }, [router]);

  // Idle Activity Listener for shared cashier POS terminals
  useEffect(() => {
    if (isLandingPage || isLoginPage || isPelangganRoute) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleTimeoutLogout();
      }, IDLE_TIMEOUT_MS);
    };

    resetTimer();

    const activityEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [isLandingPage, isLoginPage, isPelangganRoute, handleTimeoutLogout]);

  if (isLandingPage || isLoginPage || isPelangganRoute) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
