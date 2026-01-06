import { Outlet, useLocation } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import VenueApplications from './VenueApplications';

const venueTabs = [
  { label: 'Applications', href: '/venue' },
  { label: 'Messages', href: '/venue/messages' },
  { label: 'Listings', href: '/venue/listings' },
];

export default function VenueDashboard() {
  const location = useLocation();
  
  // Show VenueApplications as default content for /venue route
  const isRootVenuePath = location.pathname === '/venue';

  return (
    <DashboardLayout tabs={venueTabs}>
      {isRootVenuePath ? <VenueApplications /> : <Outlet />}
    </DashboardLayout>
  );
}
