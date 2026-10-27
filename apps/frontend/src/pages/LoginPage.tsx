import React from 'react';
import { Navigate } from 'react-router-dom';
import { RoutePaths } from '@/constants/routes';

/**
 * Halaman /masuk dialihkan langsung ke Landing Page (/) sebagai Single Gateway akses peran.
 */
export const LoginPage: React.FC = () => {
  return <Navigate to={RoutePaths.LANDING} replace />;
};
