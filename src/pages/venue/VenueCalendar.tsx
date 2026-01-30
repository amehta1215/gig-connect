import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, Plus } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { toast } from 'sonner';
interface GigListing {
  id: string;
  gig_date: string;
  venue_listing_id: string;
  artist_id: string;
  manual_artist_name: string | null;
  venue_listing?: {
    venue_name: string;
    room_name: string | null;
  };
  artist_profile?: {
    band_name: string | null;
  };
  artist?: {
    first_name: string;
    last_name: string;
  };
}
interface VenueListing {
  id: string;
  venue_name: string;
  room_name: string | null;
}
export default function VenueCalendar() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<GigListing[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  // Create event dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [venueListings, setVenueListings] = useState<VenueListing[]>([]);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState('');
  const [eventArtistName, setEventArtistName] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (user) {
      fetchGigs();
      fetchVenueListings();
    }
  }, [user]);
  const fetchGigs = async () => {
    setLoading(true);

    // First get venue profile
    const {
      data: venueProfile
    } = await supabase.from('venue_profiles').select('id').eq('user_id', user!.id).single();
    if (!venueProfile) {
      setLoading(false);
      return;
    }

    // Get venue listings
    const {
      data: listings
    } = await supabase.from('venue_listings').select('id').eq('venue_profile_id', venueProfile.id);
    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }
    const listingIds = listings.map(l => l.id);

    // Get gigs for these listings
    const {
      data: gigsData
    } = await supabase.from('gig_listings').select('*').in('venue_listing_id', listingIds).order('gig_date', {
      ascending: true
    });
    if (gigsData) {
      // Fetch additional data for each gig
      const enrichedGigs = await Promise.all(gigsData.map(async gig => {
        const [venueListingRes, artistProfileRes, artistRes] = await Promise.all([supabase.from('venue_listings').select('venue_name, room_name').eq('id', gig.venue_listing_id).single(), supabase.from('artist_profiles').select('band_name').eq('user_id', gig.artist_id).maybeSingle(), supabase.from('profiles').select('first_name, last_name').eq('id', gig.artist_id).maybeSingle()]);
        return {
          ...gig,
          venue_listing: venueListingRes.data,
          artist_profile: artistProfileRes.data,
          artist: artistRes.data
        };
      }));
      setGigs(enrichedGigs);
    }
    setLoading(false);
  };
  const fetchVenueListings = async () => {
    const {
      data: venueProfile
    } = await supabase.from('venue_profiles').select('id').eq('user_id', user!.id).single();
    if (!venueProfile) return;
    const {
      data: listings
    } = await supabase.from('venue_listings').select('id, venue_name, room_name').eq('venue_profile_id', venueProfile.id);
    if (listings) {
      setVenueListings(listings);
      if (listings.length === 1) {
        setSelectedListingId(listings[0].id);
      }
    }
  };
  const handleCreateEventClick = () => {
    setEventDate(selectedDate);
    setEventTime('');
    setEventArtistName('');
    setSelectedListingId(venueListings.length === 1 ? venueListings[0].id : '');
    setCreateDialogOpen(true);
  };
  const handleCreateEvent = async () => {
    if (!eventDate || !selectedListingId) {
      toast.error('Please select a date and room');
      return;
    }
    if (!eventArtistName.trim()) {
      toast.error('Please enter an artist name');
      return;
    }
    setCreating(true);

    // Create gig listing without application_id
    // Store artist name in manual_artist_name for venue-created manual events
    const {
      data: newGig,
      error
    } = await supabase.from('gig_listings').insert({
      venue_listing_id: selectedListingId,
      artist_id: user!.id,
      // Use venue user as placeholder for manual events
      gig_date: format(eventDate, 'yyyy-MM-dd'),
      show_time: eventTime || null,
      notes: null,
      openers: [],
      manual_artist_name: eventArtistName.trim() || null
    }).select().single();
    setCreating(false);
    if (error) {
      toast.error('Failed to create event');
      return;
    }
    toast.success('Event created!');
    setCreateDialogOpen(false);
    fetchGigs();

    // Navigate to gig detail page
    if (newGig) {
      navigate(`/venue/calendar/${newGig.id}`);
    }
  };
  const gigDates = gigs.map(g => new Date(g.gig_date));
  const gigsOnSelectedDate = selectedDate ? gigs.filter(g => format(new Date(g.gig_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];
  const today = startOfDay(new Date());
  const modifiers = {
    hasGig: gigDates,
    past: { before: today }
  };
  const modifiersStyles = {
    hasGig: {
      backgroundColor: '#b0177f',
      color: 'white',
      borderRadius: '0'
    },
    past: {
      opacity: 0.3
    }
  };
  const canCreateEvent = selectedDate && selectedDate >= today;
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card animate-pulse" />
        <div className="h-64 bg-card animate-pulse" />
      </div>;
  }
  return <div className="space-y-6 animate-fade-in">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-card border border-border p-4 flex items-center justify-center">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} modifiers={modifiers} modifiersStyles={modifiersStyles} disablePastDates={false} className="pointer-events-auto" />
        </div>

        {/* Events on selected date */}
        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm text-primary tracking-widest">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy').toUpperCase() : 'SELECT A DATE'}
            </h2>
            {canCreateEvent && <Button size="sm" onClick={handleCreateEventClick} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" />
                CREATE EVENT
              </Button>}
          </div>
          
          {gigsOnSelectedDate.length === 0 ? <p className="text-muted-foreground text-sm">No events on this date</p> : <div className="space-y-3">
              {gigsOnSelectedDate.map(gig => {
            const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
            const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
            return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                    <p className="font-display text-lg text-accent">{artistName}</p>
                    <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                  </button>;
          })}
            </div>}
        </div>
      </div>

      {/* Upcoming gigs list */}
      <div className="bg-card border border-border p-6">
        <h2 className="font-display text-sm text-primary tracking-widest mb-4">UPCOMING SHOWS</h2>
        {gigs.length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-2">
            {gigs.filter(g => new Date(g.gig_date) >= new Date()).map(gig => {
          const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
          const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
          return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                  <div>
                    <p className="font-display text-accent">{artistName}</p>
                    <p className="text-xs text-muted-foreground">{roomDisplay}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(gig.gig_date), 'MMM d, yyyy')}
                  </span>
                </button>;
        })}
          </div>}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">ADD GIG DETAILS</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            

            {/* Room Selection */}
            {venueListings.length > 1 && <div className="space-y-2">
                <label className="font-display text-xs text-primary tracking-widest">ROOM</label>
                <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {venueListings.map(listing => <SelectItem key={listing.id} value={listing.id}>
                        {listing.room_name || listing.venue_name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>}

            {/* Date (read-only) */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">DATE</label>
              <div className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border rounded-md">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">
                  {eventDate ? format(eventDate, 'MMMM do, yyyy') : 'No date selected'}
                </span>
              </div>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">TIME OF SHOW</label>
              <div className="relative">
                <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="pl-10" />
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Artist Name (optional) */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">ARTIST NAME <span className="text-destructive">*</span></label>
              <Input value={eventArtistName} onChange={e => setEventArtistName(e.target.value)} placeholder="Enter artist or event name" required />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={creating || !eventDate || !selectedListingId || !eventArtistName.trim()} className="bg-primary hover:bg-primary/90">
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}