import { Outlet, useLocation } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import PublicFindVenues from './PublicFindVenues';

const publicTabs = [
  { label: 'Find Venues', href: '/', requiresAuth: false },
  { label: 'Applications', href: '/applications', requiresAuth: true },
  { label: 'Inbox', href: '/messages', requiresAuth: true },
  { label: 'Calendar', href: '/calendar', requiresAuth: true },
];

export default function PublicDashboard() {
  const location = useLocation();
  
  // Show PublicFindVenues as default content for / route
  const isRootPath = location.pathname === '/';

  return (
    <PublicLayout tabs={publicTabs}>
      {isRootPath ? <PublicFindVenues /> : <Outlet />}
    </PublicLayout>
  );
}
