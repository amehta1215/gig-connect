import { Outlet, useLocation, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import FindVenues from './FindVenues';

const artistTabs = [
  { label: 'Find Rooms', href: '/artist' },
  { label: 'Messages', href: '/artist/messages' },
  { label: 'Applications', href: '/artist/applications' },
  { label: 'Calendar', href: '/artist/calendar' },
];

export default function ArtistDashboard() {
  const location = useLocation();
  
  // Show FindVenues as default content for /artist route
  const isRootArtistPath = location.pathname === '/artist';

  return (
    <DashboardLayout tabs={artistTabs}>
      {isRootArtistPath ? <FindVenues /> : <Outlet />}
    </DashboardLayout>
  );
}
