import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { registry } from '@/services/registry';
import { UserSession } from '@/types/domain';
import { RoutePaths } from '@/constants/routes';

export const OfficerRouteGuard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const authService = registry.getServices().auth;
        const user = await authService.getCurrentUser();

        if (isMounted) {
          setCurrentUser(user);
        }
      } catch (err) {
        console.error('Error verifying officer auth:', err);
        if (isMounted) {
          setCurrentUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--lf-canvas)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-[var(--lf-action)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--lf-muted)] font-medium">Memverifikasi sesi petugas...</span>
        </div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'OFFICER') {
    return <Navigate to={RoutePaths.OFFICER_LOGIN} replace />;
  }

  return <Outlet context={{ currentUser }} />;
};
