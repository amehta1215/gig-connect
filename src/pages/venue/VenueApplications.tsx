import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle2, Archive, ListFilter, Calendar, Music, CalendarIcon, X } from 'lucide-react';
import { format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
interface Application {
  id: string;
  artist_id: string;
  venue_listing_id: string;
  status: 'in_progress' | 'accepted' | 'archived';
  payment_preference: string | null;
  lineup_preference: string | null;
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
}
const genres = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];
const paymentPreferences = [{
  value: 'all',
  label: 'Payment Preference'
}, {
  value: 'door_split',
  label: 'Door'
}, {
  value: 'bar_split',
  label: 'Bar'
}, {
  value: 'tip_based',
  label: 'Tips'
}, {
  value: 'flat_fee',
  label: 'Flat'
}, {
  value: 'rental',
  label: 'Rental'
}];
const lineupPreferences = [{
  value: 'all',
  label: 'Lineup'
}, {
  value: 'co_acts_needed',
  label: 'Co-acts needed'
}, {
  value: 'co_acts_confirmed',
  label: 'Co-acts confirmed'
}, {
  value: 'solo_performer',
  label: 'Solo'
}];
export default function VenueApplications() {
  const {
    user
  } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
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
    const {
      data: venueProfile
    } = await supabase.from('venue_profiles').select('id').eq('user_id', user.id).single();
    if (!venueProfile) {
      setLoading(false);
      return;
    }
    const {
      data: listings
    } = await supabase.from('venue_listings').select('id').eq('venue_profile_id', venueProfile.id);
    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }
    const listingIds = listings.map(l => l.id);
    const {
      data,
      error
    } = await supabase.from('applications').select(`
        *,
        artist:profiles!applications_artist_id_fkey(first_name, last_name),
        artist_profile:artist_profiles!inner(band_name, genre)
      `).in('venue_listing_id', listingIds).order('created_at', {
      ascending: false
    });
    if (data && !error) {
      setApplications(data as unknown as Application[]);
    }
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
      bgColor: 'bg-yellow-500/10'
    },
    accepted: {
      icon: CheckCircle2,
      label: 'ACCEPTED',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    archived: {
      icon: Archive,
      label: 'ARCHIVED',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    }
  };
  const ApplicationCard = ({
    application
  }: {
    application: Application;
  }) => {
    const config = statusConfig[application.status];
    const StatusIcon = config.icon;
    const bandName = application.artist_profile?.band_name || `${application.artist?.first_name} ${application.artist?.last_name}`;
    return <div className={`bg-card border p-4 transition-colors ${!application.is_read ? 'border-primary/50' : 'border-border hover:border-primary/30'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {!application.is_read && <div className="w-2 h-2 bg-primary" />}
              <h3 className="font-display text-xl text-foreground tracking-wide">
                {bandName}
              </h3>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {application.artist_profile?.genre && <span className="flex items-center gap-1 uppercase tracking-wider">
                  <Music className="h-3 w-3" />
                  {application.artist_profile.genre}
                </span>}
              <span className="flex items-center gap-1 uppercase tracking-wider">
                <Calendar className="h-3 w-3" />
                {format(new Date(application.created_at), 'MMM d')}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider ${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </div>
        </div>
        
        {application.message && <p className="text-xs text-muted-foreground mt-3 line-clamp-2 bg-secondary/50 p-2">
            {application.message}
          </p>}

        <div className="flex flex-wrap gap-1 mt-3">
          {application.payment_preference && <span className="text-[10px] bg-secondary px-2 py-0.5 uppercase tracking-wider">
              {application.payment_preference.replace('_', ' ')}
            </span>}
          {application.lineup_preference && <span className="text-[10px] bg-secondary px-2 py-0.5 uppercase tracking-wider">
              {application.lineup_preference.replace('_', ' ')}
            </span>}
        </div>
      </div>;
  };
  return <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <h1 className="font-display section-title text-[hsl(var(--neon-accent))] font-bold">APPLICATIONS</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilterUnread(!filterUnread)} className={`px-3 py-2 text-xs font-display tracking-wider transition-colors ${filterUnread ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
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
          <SelectTrigger className="w-28 bg-card border-border text-xs">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Genre</SelectItem>
            {genres.map(genre => <SelectItem key={genre} value={genre}>{genre}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-44 bg-card border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentPreferences.map(pref => <SelectItem key={pref.value} value={pref.value}>{pref.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterLineup} onValueChange={setFilterLineup}>
          <SelectTrigger className="w-36 bg-card border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lineupPreferences.map(pref => <SelectItem key={pref.value} value={pref.value}>{pref.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-auto bg-card border-border text-xs justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-3 w-3" />
              {dateRange?.from ? dateRange.to ? <>
                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                  </> : format(dateRange.from, "MMM d, yyyy") : <span>Date Range</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>

        {dateRange && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDateRange(undefined)}>
            <X className="h-3 w-3" />
          </Button>}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border p-0 h-auto">
          <TabsTrigger value="all" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            ALL
          </TabsTrigger>
          <TabsTrigger value="accepted" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            ACCEPTED
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            PENDING
          </TabsTrigger>
          <TabsTrigger value="archived" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            ARCHIVED
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card animate-pulse" />)}
            </div> : filteredApplications.length === 0 ? <div className="text-center py-16 bg-card border border-border">
              <h3 className="font-display text-xl text-muted-foreground">EMPTY</h3>
            </div> : <div className="space-y-3">
              {filteredApplications.map(application => <ApplicationCard key={application.id} application={application} />)}
            </div>}
        </TabsContent>
      </Tabs>
    </div>;
}