import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { OfficerLayout } from '@/components/layouts/OfficerLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { OfficerDashboardPage } from '@/pages/officer/OfficerDashboardPage';
import { OfficerInventoryPage } from '@/pages/officer/OfficerInventoryPage';
import { OfficerRegisterItemPage } from '@/pages/officer/OfficerRegisterItemPage';
import { OfficerReportsPage } from '@/pages/officer/OfficerReportsPage';
import { OfficerReportDetailPage } from '@/pages/officer/OfficerReportDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { RoutePaths } from '@/constants/routes';

export const router = createBrowserRouter(
  [
    // Public & Guest Routes
    {
      path: RoutePaths.LANDING,
      element: <PublicLayout />,
      children: [
        { index: true, element: <LandingPage /> },
        { path: RoutePaths.GUEST_HOME, element: <PlaceholderPage title="Beranda Tamu (Belum Diimplementasikan)" /> },
        { path: RoutePaths.CATALOG, element: <PlaceholderPage title="Katalog Barang (Belum Diimplementasikan)" /> },
        { path: RoutePaths.ITEM_DETAIL, element: <PlaceholderPage title="Detail Barang (Belum Diimplementasikan)" /> },
        { path: RoutePaths.POSTS, element: <PlaceholderPage title="Pos Pelayanan (Belum Diimplementasikan)" /> },
        { path: RoutePaths.GUIDE, element: <PlaceholderPage title="Panduan (Belum Diimplementasikan)" /> },
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
        { path: 'inventaris/:id', element: <PlaceholderPage title="Detail Inventaris (Step 3)" /> },
        { path: 'catat-barang', element: <OfficerRegisterItemPage /> },
        { path: 'laporan', element: <OfficerReportsPage /> },
        { path: 'laporan/:id', element: <OfficerReportDetailPage /> },
        { path: 'akun', element: <PlaceholderPage title="Pengaturan Akun (Step 3)" /> },
      ],
    },

    // Fallback 404 Route
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  }
);
