import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { OfficerLayout } from '@/components/layouts/OfficerLayout';
import { StudentRouteGuard } from '@/components/guards/StudentRouteGuard';
import { OfficerRouteGuard } from '@/components/guards/OfficerRouteGuard';
import { LandingPage } from '@/pages/LandingPage';
import { GuestHomePage } from '@/pages/GuestHomePage';
import { CatalogPage } from '@/pages/CatalogPage';
import { ItemDetailPage } from '@/pages/ItemDetailPage';
import { PostsPage } from '@/pages/PostsPage';
import { GuidePage } from '@/pages/GuidePage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { OfficerLoginPage } from '@/pages/officer/OfficerLoginPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerInventoryPage } from '@/pages/officer/OfficerInventoryPage';
import { OfficerRegisterItemPage } from '@/pages/officer/OfficerRegisterItemPage';
import { OfficerReportsPage } from '@/pages/officer/OfficerReportsPage';
import { OfficerAccountPage } from '@/pages/officer/OfficerAccountPage';
import { OfficerItemDetailPage } from '@/pages/officer/OfficerItemDetailPage';
import { OfficerReportDetailPage } from '@/pages/officer/OfficerReportDetailPage';
import { StudentHomePage } from '@/pages/student/StudentHomePage';
import { StudentReportFoundPage } from '@/pages/student/StudentReportFoundPage';
import { StudentMyReportsPage } from '@/pages/student/StudentMyReportsPage';
import { StudentReportDetailPage } from '@/pages/student/StudentReportDetailPage';
import { StudentProfilePage } from '@/pages/student/StudentProfilePage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RoutePaths } from '@/constants/routes';

export const router = createBrowserRouter([
  // Dedicated Officer Login Route
  {
    path: RoutePaths.OFFICER_LOGIN,
    element: <OfficerLoginPage />,
  },

  // Public & Guest Routes
  {
    path: RoutePaths.LANDING,
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: RoutePaths.GUEST_HOME, element: <GuestHomePage /> },
      { path: RoutePaths.CATALOG, element: <CatalogPage /> },
      { path: RoutePaths.ITEM_DETAIL, element: <ItemDetailPage /> },
      { path: RoutePaths.POSTS, element: <PostsPage /> },
      { path: RoutePaths.GUIDE, element: <GuidePage /> },
      { path: RoutePaths.LOGIN, element: <LoginPage /> },
      { path: RoutePaths.REGISTER, element: <RegisterPage /> },
      { path: RoutePaths.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: '/lupa-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ForgotPasswordPage /> },
    ],
  },

  // Officer / Petugas Routes
  {
    path: '/petugas',
    element: <OfficerRouteGuard />,
    children: [
      {
        element: <OfficerLayout />,
        children: [
          { index: true, element: <Navigate to={RoutePaths.OFFICER_DASHBOARD} replace /> },
          { path: 'dashboard', element: <OfficerDashboardPage /> },
          { path: 'inventaris', element: <OfficerInventoryPage /> },
          { path: 'inventaris/:id', element: <OfficerItemDetailPage /> },
          { path: 'catat-barang', element: <OfficerRegisterItemPage /> },
          { path: 'laporan', element: <OfficerReportsPage /> },
          { path: 'laporan/:id', element: <OfficerReportDetailPage /> },
          { path: 'akun', element: <OfficerAccountPage /> },
        ],
      },
    ],
  },

  // Student / Mahasiswa Routes (Unified Shell)
  {
    path: '/mahasiswa',
    element: <PublicLayout />,
    children: [
      {
        element: <StudentRouteGuard />,
        children: [
          { index: true, element: <Navigate to="beranda" replace /> },
          { path: 'beranda', element: <StudentHomePage /> },
          { path: 'lapor-temuan', element: <StudentReportFoundPage /> },
          { path: 'laporan-saya', element: <StudentMyReportsPage /> },
          { path: 'laporan-saya/:id', element: <StudentReportDetailPage /> },
          { path: 'profil', element: <StudentProfilePage /> },
        ],
      },
    ],
  },

  // Fallback 404 Route
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
