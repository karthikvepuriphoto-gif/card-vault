import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { CollectionProvider } from './collection';
import { AppShell } from './components/AppShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AddPage } from './pages/AddPage';
import { BackupPage } from './pages/BackupPage';
import { CollectionPage } from './pages/CollectionPage';
import { DetailPage } from './pages/DetailPage';

const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

function Root() {
  return (
    <CollectionProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CollectionProvider>
  );
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Root />,
      children: [
        { index: true, element: <CollectionPage /> },
        { path: 'add', element: <AddPage /> },
        { path: 'card/:id', element: <DetailPage /> },
        { path: 'backup', element: <BackupPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename },
);

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
