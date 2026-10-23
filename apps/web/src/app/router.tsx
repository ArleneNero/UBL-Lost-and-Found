import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '@/components/layouts/PublicLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';
import { RoutePaths } from '@/constants/routes';

export const router = createBrowserRouter([
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

  // Fallback 404 Route
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
