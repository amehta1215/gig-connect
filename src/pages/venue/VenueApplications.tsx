import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Archive, ListFilter, Calendar, Music, CalendarIcon, X, Users } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface VenueListing {
  id: string;
  venue_name: string;
  room_name: string | null;
}

interface Application {
  id: string;
  artist_id: string;
  venue_listing_id: string;
  status: 'in_progress' | 'accepted' | 'archived';
  payment_preference: string | null;
  lineup_preference: string | null;
  availability_preference: 'date_range' | 'specific_dates' | 'flexible' | null;
  availability_start_date: string | null;
  availability_end_date: string | null;
  availability_specific_dates: string[] | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
  artist?: {
    first_name: string;
    last_name: string;
  };
  artist_profile?: {
    band_name: string | null;
    genre: string | null;
  };
  venue_listing?: VenueListing;
}

const genres = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];

const paymentPreferences = [
  { value: 'all', label: 'All Payments' },
  { value: 'door_split', label: 'Door' },
  { value: 'bar_split', label: 'Bar' },
  { value: 'tip_based', label: 'Tips' },
  { value: 'flat_fee', label: 'Flat' },
  { value: 'rental', label: 'Rental' },
];

const lineupPreferences = [
  { value: 'all', label: 'All Lineups' },
  { value: 'co_acts_needed', label: 'Co-acts needed' },
  { value: 'co_acts_confirmed', label: 'Co-acts confirmed' },
  { value: 'solo_performer', label: 'Solo' },
];

const lineupLabels: Record<string, string> = {
  co_acts_needed: 'Co-acts Needed',
  co_acts_confirmed: 'Co-acts Confirmed',
  solo_performer: 'Solo',
};

export default function VenueApplications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [venueListings, setVenueListings] = useState<Map<string, VenueListing>>(new Map());
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterLineup, setFilterLineup] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;
    setLoading(true);

    const { data: venueProfile } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!venueProfile) {
      setLoading(false);
      return;
    }

    const { data: listings } = await supabase
      .from('venue_listings')
      .select('id, venue_name, room_name')
      .eq('venue_profile_id', venueProfile.id);

    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }

    // Store listings for lookup
    const listingsMap = new Map<string, VenueListing>();
    listings.forEach(l => listingsMap.set(l.id, l));
    setVenueListings(listingsMap);

    const listingIds = listings.map(l => l.id);
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        artist:profiles!applications_artist_id_fkey(first_name, last_name)
      `)
      .in('venue_listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch applications:', error);
      setApplications([]);
      setLoading(false);
      return;
    }

    const apps = (data || []) as unknown as Application[];

    // Fetch artist profiles
    const artistIds = Array.from(new Set(apps.map(a => a.artist_id)));
    const { data: artistProfiles, error: artistProfilesError } = await supabase
      .from('artist_profiles')
      .select('user_id, band_name, genre')
      .in('user_id', artistIds);

    if (artistProfilesError) {
      console.error('Failed to fetch artist profiles:', artistProfilesError);
      setApplications(apps);
      setLoading(false);
      return;
    }

    const profileByUserId = new Map(
      (artistProfiles || []).map(p => [p.user_id, { band_name: p.band_name, genre: p.genre }])
    );

    const merged = apps.map(app => ({
      ...app,
      artist_profile: profileByUserId.get(app.artist_id),
      venue_listing: listingsMap.get(app.venue_listing_id),
    }));

    setApplications(merged as unknown as Application[]);
    setLoading(false);
  };

  const getFilteredApplications = () => {
    let filtered = [...applications];
    if (activeTab !== 'all') {
      filtered = filtered.filter(app => app.status === activeTab);
    }
    if (filterUnread) {
      filtered = filtered.filter(app => !app.is_read);
    }
    if (filterGenre !== 'all') {
      filtered = filtered.filter(app => app.artist_profile?.genre?.toLowerCase().includes(filterGenre.toLowerCase()));
    }
    if (filterPayment !== 'all') {
      filtered = filtered.filter(app => app.payment_preference === filterPayment);
    }
    if (filterLineup !== 'all') {
      filtered = filtered.filter(app => app.lineup_preference === filterLineup);
    }
    if (dateRange?.from) {
      filtered = filtered.filter(app => {
        const appDate = new Date(app.created_at);
        const fromDate = startOfDay(dateRange.from!);
        const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from!);
        return !isBefore(appDate, fromDate) && !isAfter(appDate, toDate);
      });
    }
    if (sortBy === 'oldest') {
      filtered.reverse();
    }
    return filtered;
  };

  const filteredApplications = getFilteredApplications();

  const statusConfig = {
    in_progress: {
      icon: Clock,
      label: 'PENDING',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    accepted: {
      icon: CheckCircle2,
      label: 'ACCEPTED',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    archived: {
      icon: Archive,
      label: 'ARCHIVED',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  };

  const formatAvailability = (app: Application) => {
    if (app.availability_preference === 'date_range' && app.availability_start_date && app.availability_end_date) {
      return `${format(new Date(app.availability_start_date), 'MMM d')} - ${format(new Date(app.availability_end_date), 'MMM d, yyyy')}`;
    }
    if (app.availability_preference === 'specific_dates' && app.availability_specific_dates?.length) {
      return app.availability_specific_dates.map(d => format(new Date(d), 'MMM d')).join(', ');
    }
    if (app.availability_preference === 'flexible') {
      return 'Flexible dates';
    }
    return null;
  };

  const ApplicationCard = ({ application }: { application: Application }) => {
    const config = statusConfig[application.status];
    const StatusIcon = config.icon;
    const bandName = application.artist_profile?.band_name || `${application.artist?.first_name} ${application.artist?.last_name}`;
    const roomDisplay = application.venue_listing?.room_name || application.venue_listing?.venue_name || '';
    const availability = formatAvailability(application);

    return (
      <div
        onClick={() => navigate(`/venue/applications/${application.id}`)}
        className={`bg-card border p-4 transition-colors cursor-pointer ${!application.is_read ? 'border-primary/50' : 'border-border hover:border-primary/30'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {!application.is_read && <div className="w-2 h-2 bg-primary" />}
              <h3 className="font-display text-xl text-foreground tracking-wide">
                {bandName}
              </h3>
            </div>
            
            {/* Room/Venue applied to */}
            {roomDisplay && (
              <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">
                Applied to: <span className="text-accent">{roomDisplay}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {application.artist_profile?.genre && (
                <span className="uppercase tracking-wider">
                  Genre: <span className="text-accent">{application.artist_profile.genre}</span>
                </span>
              )}
              {application.lineup_preference && (
                <span className="uppercase tracking-wider">
                  Act Type: <span className="text-accent">{lineupLabels[application.lineup_preference] || application.lineup_preference.replace('_', ' ')}</span>
                </span>
              )}
              <span className="uppercase tracking-wider">
                Application Date: <span className="text-accent">{format(new Date(application.created_at), 'MMM d')}</span>
              </span>
            </div>

            {/* Availability dates */}
            {availability && (
              <p className="text-xs text-primary mt-2">
                Dates: {availability}
              </p>
            )}
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider ${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </div>
        </div>

        {application.message && (
          <p className="text-xs text-muted-foreground mt-3 line-clamp-2 bg-secondary/50 p-2">
            {application.message}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-3">
          {application.payment_preference && (
            <span className="text-[10px] bg-secondary px-2 py-0.5 uppercase tracking-wider">
              {application.payment_preference.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <h1 className="font-display section-title text-accent font-bold">APPLICATIONS</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setFilterUnread(!filterUnread)}
          className={`px-3 py-2 text-xs font-display tracking-wider transition-colors ${filterUnread ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}
        >
          UNREAD
        </button>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-28 bg-card border-border text-xs">
            <ListFilter className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterGenre} onValueChange={setFilterGenre}>
          <SelectTrigger className="w-32 bg-card border-border text-xs">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genres</SelectItem>
            {genres.map(genre => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-36 bg-card border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentPreferences.map(pref => (
              <SelectItem key={pref.value} value={pref.value}>{pref.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLineup} onValueChange={setFilterLineup}>
          <SelectTrigger className="w-36 bg-card border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lineupPreferences.map(pref => (
              <SelectItem key={pref.value} value={pref.value}>{pref.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-auto bg-card border-border text-xs justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                  </>
                ) : (
                  format(dateRange.from, "MMM d, yyyy")
                )
              ) : (
                <span>Date Range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {dateRange && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDateRange(undefined)}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border p-0 h-auto">
          <TabsTrigger
            value="all"
            className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2"
          >
            ALL
          </TabsTrigger>
          <TabsTrigger
            value="accepted"
            className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2"
          >
            ACCEPTED
          </TabsTrigger>
          <TabsTrigger
            value="in_progress"
            className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2"
          >
            PENDING
          </TabsTrigger>
          <TabsTrigger
            value="archived"
            className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2"
          >
            ARCHIVED
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-card animate-pulse" />
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border">
              <h3 className="font-display text-xl text-muted-foreground">EMPTY</h3>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map(application => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}