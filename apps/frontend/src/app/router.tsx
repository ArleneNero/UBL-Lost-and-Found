import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { OfficerLayout } from '@/components/layouts/OfficerLayout';
import { LandingPage } from '@/pages/LandingPage';
import { GuestHomePage } from '@/pages/GuestHomePage';
import { CatalogPage } from '@/pages/CatalogPage';
import { ItemDetailPage } from '@/pages/ItemDetailPage';
import { PostsPage } from '@/pages/PostsPage';
import { GuidePage } from '@/pages/GuidePage';
import { LoginPage } from '@/pages/LoginPage';
import { OfficerLoginPage } from '@/pages/officer/OfficerLoginPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerInventoryPage } from '@/pages/officer/OfficerInventoryPage';
import { OfficerRegisterItemPage } from '@/pages/officer/OfficerRegisterItemPage';
import { OfficerReportsPage } from '@/pages/officer/OfficerReportsPage';
import { OfficerAccountPage } from '@/pages/officer/OfficerAccountPage';
import { OfficerItemDetailPage } from '@/pages/officer/OfficerItemDetailPage';
import { OfficerReportDetailPage } from '@/pages/officer/OfficerReportDetailPage';
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
    ],
  },

  // Officer / Petugas Routes
  {
    path: '/petugas',
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

  // Student / Mahasiswa Routes (Belum dibuka pada tahap ini - Dialihkan ke Beranda Tamu)
  {
    path: '/mahasiswa/*',
    element: <Navigate to={RoutePaths.GUEST_HOME} replace />,
  },

  // Fallback 404 Route
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
