import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, CheckCircle2, Archive, ListFilter, Calendar, Music, User } from 'lucide-react';
import { format } from 'date-fns';

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
  artist?: { first_name: string; last_name: string };
  artist_profile?: { band_name: string | null; genre: string | null };
}

const genres = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];
const paymentPreferences = [
  { value: 'all', label: 'All payment types' },
  { value: 'door_split', label: 'Door split' },
  { value: 'bar_split', label: 'Bar split' },
  { value: 'tip_based', label: 'Tip-based' },
  { value: 'flat_fee', label: 'Flat fee' },
  { value: 'rental', label: 'Rental' },
  { value: 'no_preference', label: 'No preference' },
];
const lineupPreferences = [
  { value: 'all', label: 'All lineup types' },
  { value: 'co_acts_needed', label: 'Co-acts needed' },
  { value: 'co_acts_confirmed', label: 'Co-acts confirmed' },
  { value: 'solo_performer', label: 'Solo performer' },
  { value: 'no_preference', label: 'No preference' },
];

export default function VenueApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [filterUnread, setFilterUnread] = useState(false);
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterPayment, setFilterPayment] = useState('all');
  const [filterLineup, setFilterLineup] = useState('all');

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    setLoading(true);
    
    // First get venue profile
    const { data: venueProfile } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!venueProfile) {
      setLoading(false);
      return;
    }

    // Get listings for this venue
    const { data: listings } = await supabase
      .from('venue_listings')
      .select('id')
      .eq('venue_profile_id', venueProfile.id);

    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }

    const listingIds = listings.map(l => l.id);

    // Get applications for these listings
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        artist:profiles!applications_artist_id_fkey(first_name, last_name),
        artist_profile:artist_profiles!inner(band_name, genre)
      `)
      .in('venue_listing_id', listingIds)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setApplications(data as unknown as Application[]);
    }
    setLoading(false);
  };

  const getFilteredApplications = () => {
    let filtered = [...applications];

    // Filter by status tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(app => app.status === activeTab);
    }

    // Filter unread only
    if (filterUnread) {
      filtered = filtered.filter(app => !app.is_read);
    }

    // Filter by genre
    if (filterGenre !== 'all') {
      filtered = filtered.filter(app => 
        app.artist_profile?.genre?.toLowerCase().includes(filterGenre.toLowerCase())
      );
    }

    // Filter by payment preference
    if (filterPayment !== 'all') {
      filtered = filtered.filter(app => app.payment_preference === filterPayment);
    }

    // Filter by lineup preference
    if (filterLineup !== 'all') {
      filtered = filtered.filter(app => app.lineup_preference === filterLineup);
    }

    // Sort
    if (sortBy === 'oldest') {
      filtered.reverse();
    }

    return filtered;
  };

  const filteredApplications = getFilteredApplications();

  const statusConfig = {
    in_progress: {
      icon: Clock,
      label: 'In Progress',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    accepted: {
      icon: CheckCircle2,
      label: 'Accepted',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    archived: {
      icon: Archive,
      label: 'Archived',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  };

  const ApplicationCard = ({ application }: { application: Application }) => {
    const config = statusConfig[application.status];
    const StatusIcon = config.icon;
    const bandName = application.artist_profile?.band_name || 
      `${application.artist?.first_name} ${application.artist?.last_name}`;

    return (
      <div className={`bg-card border rounded-xl p-5 transition-colors ${
        !application.is_read ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {!application.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
              <h3 className="font-display text-xl text-foreground">
                {bandName}
              </h3>
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              {application.artist_profile?.genre && (
                <span className="flex items-center gap-1">
                  <Music className="h-3 w-3" />
                  {application.artist_profile.genre}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(application.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-4 w-4" />
            {config.label}
          </div>
        </div>
        
        {application.message && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2 bg-secondary/50 p-3 rounded-lg">
            "{application.message}"
          </p>
        )}

        <div className="flex flex-wrap gap-2 mt-4">
          {application.payment_preference && (
            <span className="text-xs bg-secondary px-2 py-1 rounded-full">
              {application.payment_preference.replace('_', ' ')}
            </span>
          )}
          {application.lineup_preference && (
            <span className="text-xs bg-secondary px-2 py-1 rounded-full">
              {application.lineup_preference.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-gradient">Applications</h1>
        <p className="text-muted-foreground mt-1">Review artist applications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <ListFilter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>

        <button
          onClick={() => setFilterUnread(!filterUnread)}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filterUnread
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:text-foreground'
          }`}
        >
          Unread only
        </button>

        <Select value={filterGenre} onValueChange={setFilterGenre}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterPayment} onValueChange={setFilterPayment}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {paymentPreferences.map((pref) => (
              <SelectItem key={pref.value} value={pref.value}>{pref.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLineup} onValueChange={setFilterLineup}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {lineupPreferences.map((pref) => (
              <SelectItem key={pref.value} value={pref.value}>{pref.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            All
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accepted
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="h-4 w-4 mr-2" />
            In Progress
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Archive className="h-4 w-4 mr-2" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-2xl mb-2">No applications found</h3>
              <p className="text-muted-foreground">
                Applications from artists will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
