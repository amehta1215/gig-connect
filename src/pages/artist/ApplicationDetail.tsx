import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Users, Music, Calendar, Clock, CheckCircle2, Archive, Trash2, PauseCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { parseLocalDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useRef } from 'react';

interface GigListing {
  id: string;
  is_confirmed: boolean;
  hold_priority: number | null;
}

interface ApplicationData {
  id: string;
  status: 'in_progress' | 'accepted' | 'archived';
  created_at: string;
  message: string | null;
  availability_preference: 'date_range' | 'specific_dates' | 'flexible' | null;
  availability_start_date: string | null;
  availability_end_date: string | null;
  availability_specific_dates: string[] | null;
  payment_preference: string | null;
  lineup_preference: string | null;
  venue_listing: {
    id: string;
    venue_name: string;
    room_name: string | null;
    location: string | null;
    capacity: number | null;
    genres: string[];
    pictures: string[];
    bio: string | null;
    backline_info: string | null;
    house_rules: string | null;
    venue_profile_id: string;
  };
  gig_listing?: GigListing | null;
}

interface VenueProfile {
  id: string;
  picture: string | null;
  pictures: string[] | null;
  genres: string[] | null;
  bio: string | null;
}

interface RoomListing {
  id: string;
  venue_name: string;
  room_name: string | null;
  capacity: number | null;
  genres: string[];
  pictures: string[];
}
const statusConfig = {
  in_progress: {
    icon: Clock,
    label: 'PENDING',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  accepted: {
    icon: CheckCircle2,
    label: 'ACCEPTED',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  hold: {
    icon: PauseCircle,
    label: 'HOLD',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10'
  },
  archived: {
    icon: Archive,
    label: 'ARCHIVED',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted'
  }
};
const paymentLabels: Record<string, string> = {
  door_split: 'Door Split',
  bar_split: 'Bar Split',
  tip_based: 'Tip Based',
  flat_fee: 'Flat Fee',
  rental: 'Rental'
};
const lineupLabels: Record<string, string> = {
  co_acts_needed: 'Co-acts Needed',
  co_acts_confirmed: 'Co-acts Confirmed',
  solo_performer: 'Solo Performer'
};
const availabilityLabels: Record<string, string> = {
  date_range: 'Date Range',
  specific_dates: 'Specific Dates',
  flexible: 'Flexible'
};
export default function ApplicationDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromThreadId = (location.state as { fromThreadId?: string } | null)?.fromThreadId;
  const handleBack = () => {
    if (fromThreadId) {
      navigate('/artist/messages', { state: { threadId: fromThreadId } });
    } else {
      navigate('/artist/applications');
    }
  };
  const {
    user
  } = useAuth();
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [venueProfile, setVenueProfile] = useState<VenueProfile | null>(null);
  const [rooms, setRooms] = useState<RoomListing[]>([]);
  const galleryScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (id && user) {
      fetchApplication();
    }
  }, [id, user]);
  const fetchApplication = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('applications').select(`
        *,
        venue_listing:venue_listings(*)
      `).eq('id', id).eq('artist_id', user?.id).maybeSingle();
    if (data && !error) {
      const appData = data as unknown as ApplicationData;

      // Fetch gig listing to check hold status
      if (appData.status === 'accepted') {
        const { data: gigData } = await supabase
          .from('gig_listings')
          .select('id, is_confirmed, hold_priority')
          .eq('application_id', appData.id)
          .eq('is_confirmed', false)
          .order('hold_priority', { ascending: true })
          .limit(1)
          .maybeSingle();
        appData.gig_listing = gigData;
      }

      setApplication(appData);

      // Fetch venue profile (for bio, pictures, genres)
      const { data: profileData } = await supabase
        .from('venue_profiles')
        .select('id, picture, pictures, genres, bio')
        .eq('id', appData.venue_listing.venue_profile_id)
        .maybeSingle();
      if (profileData) setVenueProfile(profileData as VenueProfile);

      // Fetch all rooms for this venue
      const { data: roomsData } = await supabase
        .from('venue_listings')
        .select('id, venue_name, room_name, capacity, genres, pictures')
        .eq('venue_profile_id', appData.venue_listing.venue_profile_id);
      if (roomsData) setRooms(roomsData as RoomListing[]);
    }
    setLoading(false);
  };
  const handleWithdraw = async () => {
    if (!application) return;
    setWithdrawing(true);
    const {
      error
    } = await supabase.from('applications').delete().eq('id', application.id);
    setWithdrawing(false);
    if (error) {
      toast.error('Failed to withdraw application');
      return;
    }
    toast.success('Application withdrawn');
    navigate('/artist/applications');
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="h-64 bg-card animate-pulse rounded-lg" />
        <div className="h-8 w-48 bg-card animate-pulse rounded" />
        <div className="h-32 bg-card animate-pulse rounded-lg" />
      </div>;
  }
  if (!application) {
    return <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">APPLICATION NOT FOUND</h3>
        <Button onClick={() => navigate('/artist/applications')} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>;
  }
  const isHold = application.status === 'accepted' && application.gig_listing && !application.gig_listing.is_confirmed;
  const displayStatus = isHold ? 'hold' : application.status;
  const config = statusConfig[displayStatus as keyof typeof statusConfig];
  const StatusIcon = config.icon;
  const holdPriority = isHold ? application.gig_listing?.hold_priority : null;
  const listing = application.venue_listing;
  const venuePics = (venueProfile?.pictures && venueProfile.pictures.length > 0)
    ? venueProfile.pictures
    : (venueProfile?.picture ? [venueProfile.picture] : []);
  const galleryPictures = Array.from(new Set([
    ...venuePics,
    ...rooms.flatMap(r => r.pictures || []),
  ]));
  const scroll = (dir: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const card = container.children[0] as HTMLElement;
    const cardWidth = card?.offsetWidth || 300;
    container.scrollBy({ left: dir === 'left' ? -cardWidth - 8 : cardWidth + 8, behavior: 'smooth' });
  };
  return <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-2 px-4 py-2 ${config.bgColor} ${config.color} font-display tracking-widest text-sm`}>
        <StatusIcon className="h-4 w-4" />
        {isHold ? `HOLD #${holdPriority || '—'}` : config.label}
        <span className="text-muted-foreground ml-2">
          Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
        </span>
      </div>

      {/* Pictures Gallery */}
      <div className="mb-6">
        {galleryPictures.length === 0 ? (
          <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
            <div className="w-full h-full flex items-center justify-center bg-heat">
              <Music className="h-12 w-12 text-primary/30" />
            </div>
          </div>
        ) : (
          <div className="relative group">
            <div ref={galleryScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth">
              {galleryPictures.map((pic, i) => (
                <div key={i} className="flex-shrink-0 w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                  <img src={pic} alt={`${listing.venue_name} ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            {galleryPictures.length > 3 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Venue Info */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-wide text-primary">
            {listing.venue_name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {listing.location && <span className="flex items-center gap-2 text-primary">
              <MapPin className="h-4 w-4" />
              {listing.location}
            </span>}
        </div>

        {venueProfile?.genres && venueProfile.genres.length > 0 && <div className="flex flex-wrap gap-2">
            {venueProfile.genres.map(genre => <span key={genre} className="text-xs px-3 py-1 uppercase tracking-wider font-display bg-gray-200">
                {genre.toLowerCase() === 'all' ? 'All Genres' : genre}
              </span>)}
          </div>}
      </div>

      {/* Bio */}
      {venueProfile?.bio && <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="font-display text-sm text-primary tracking-widest mb-2">BIO</h3>
          <p className="text-sm text-primary whitespace-pre-line">{venueProfile.bio}</p>
        </div>}

      {/* Rooms */}
      {rooms.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-2xl text-black font-bold tracking-wide mb-4">ROOMS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rooms.map(room => (
              <div
                key={room.id}
                onClick={() => navigate(`/artist/venues/${room.id}`)}
                className="group bg-card border border-border overflow-hidden transition-all hover:border-primary cursor-pointer relative"
              >
                <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                  {(() => {
                    const pic = (room.pictures && room.pictures[0]) || venueProfile?.picture || null;
                    return pic ? (
                      <img src={pic} alt={room.room_name || room.venue_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-heat">
                        <Music className="h-12 w-12 text-primary/30" />
                      </div>
                    );
                  })()}
                  {room.capacity && (
                    <div className="absolute top-2 left-2 bg-background/90 px-2 py-0.5 text-xs font-display tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.capacity}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors tracking-wide font-semibold">
                    {room.room_name || 'Main Room'}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Your Application */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-accent font-bold">YOUR APPLICATION</h2>
          {application.status === 'in_progress' && <Button variant="ghost" size="icon" onClick={() => setWithdrawDialogOpen(true)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-5 w-5" />
            </Button>}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Availability */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">AVAILABILITY</h3>
            <p className="text-foreground">
              {application.availability_preference ? availabilityLabels[application.availability_preference] : 'Not specified'}
            </p>
            {application.availability_preference === 'date_range' && application.availability_start_date && application.availability_end_date && <p className="text-sm flex items-center gap-1 text-primary">
                <Calendar className="h-3 w-3" />
                {format(parseLocalDate(application.availability_start_date), 'MMM d')} - {format(parseLocalDate(application.availability_end_date), 'MMM d, yyyy')}
              </p>}
            {application.availability_preference === 'specific_dates' && application.availability_specific_dates && application.availability_specific_dates.length > 0 && <div className="flex flex-wrap gap-1 mt-1">
                {application.availability_specific_dates.map((date, i) => <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {format(parseLocalDate(date), 'MMM d')}
                  </span>)}
              </div>}
          </div>

          {/* Payment */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">PAYMENT PREFERENCE</h3>
            <p className="text-foreground">
              {application.payment_preference ? paymentLabels[application.payment_preference] : 'Not specified'}
            </p>
          </div>

          {/* Lineup */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">LINEUP</h3>
            <p className="text-foreground">
              {application.lineup_preference ? lineupLabels[application.lineup_preference] : 'Not specified'}
            </p>
          </div>
        </div>

        {application.message && <div className="space-y-1 pt-2 border-t border-border">
            <h3 className="font-display text-xs text-primary tracking-widest">MESSAGE</h3>
            <p className="text-muted-foreground text-sm">{application.message}</p>
          </div>}
      </div>

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Application?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to withdraw your application to {listing.venue_name}
            {listing.room_name ? `, ${listing.room_name}` : ''}? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleWithdraw} disabled={withdrawing}>
              {withdrawing ? 'Withdrawing...' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}