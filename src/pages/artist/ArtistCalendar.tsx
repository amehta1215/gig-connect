import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { CalendarIcon, Clock, Plus, CheckCircle2, PauseCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { toast } from 'sonner';
interface GigListing {
  id: string;
  gig_date: string;
  venue_listing_id: string;
  artist_id: string;
  application_id: string | null;
  manual_venue_name: string | null;
  manual_location: string | null;
  show_time: string | null;
  is_confirmed: boolean;
  hold_priority: number | null;
  venue_listing?: {
    venue_name: string;
    room_name: string | null;
    location: string | null;
  };
}
export default function ArtistCalendar() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<GigListing[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);

  // Create event dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState('');
  const [eventVenueName, setEventVenueName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (user) {
      fetchGigs();
    }
  }, [user]);
  const fetchGigs = async () => {
    setLoading(true);

    // Get gigs where artist is headliner
    const {
      data: gigsData
    } = await supabase.from('gig_listings').select('*').eq('artist_id', user!.id).order('gig_date', {
      ascending: true
    });
    if (gigsData) {
      // Fetch venue listing info for each gig
      const enrichedGigs = await Promise.all(gigsData.map(async (gig) => {
        const {
          data: venueListing
        } = await supabase.from('venue_listings').select('venue_name, room_name, location').eq('id', gig.venue_listing_id).maybeSingle();
        return {
          ...gig,
          venue_listing: venueListing
        };
      }));
      setGigs(enrichedGigs);
    }
    setLoading(false);
  };
  const handleCreateEventClick = () => {
    setEventDate(selectedDate);
    setEventTime('');
    setEventVenueName('');
    setEventLocation('');
    setCreateDialogOpen(true);
  };
  const handleCreateEvent = async () => {
    if (!eventDate) {
      toast.error('Please select a date');
      return;
    }
    if (!eventVenueName.trim()) {
      toast.error('Please enter a venue name');
      return;
    }
    if (!eventLocation.trim()) {
      toast.error('Please enter a location');
      return;
    }
    setCreating(true);

    // For artists, we need to find or create a placeholder venue listing
    // Since they may not have venue listings, we'll create a manual event 
    // that uses a placeholder venue_listing_id (this requires schema flexibility)

    // Get the first venue listing available (for the venue_listing_id requirement)
    const {
      data: anyListing
    } = await supabase.from('venue_listings').select('id').limit(1).single();
    if (!anyListing) {
      toast.error('Unable to create event - no venues available');
      setCreating(false);
      return;
    }

    // Create gig listing without application_id, using new columns for manual venue/location
    const {
      data: newGig,
      error
    } = await supabase.from('gig_listings').insert({
      venue_listing_id: anyListing.id,
      artist_id: user!.id,
      gig_date: format(eventDate, 'yyyy-MM-dd'),
      show_time: eventTime || null,
      manual_venue_name: eventVenueName.trim(),
      manual_location: eventLocation.trim(),
      openers: []
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
      navigate(`/artist/calendar/${newGig.id}`);
    }
  };
  const gigDates = gigs.map((g) => parseLocalDate(g.gig_date));
  const gigsOnSelectedDate = selectedDate ? gigs.filter((g) => format(parseLocalDate(g.gig_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];
  const confirmedGigs = gigsOnSelectedDate.filter((g) => g.is_confirmed);
  const holdGigs = gigsOnSelectedDate.filter((g) => !g.is_confirmed).sort((a, b) => (a.hold_priority || 99) - (b.hold_priority || 99));
  const today = startOfDay(new Date());
  const modifiers = {
    hasGig: gigDates,
    past: {
      before: today
    }
  };
  const modifiersStyles = {
    hasGig: {
      backgroundColor: 'hsl(14, 79%, 52%)',
      color: 'white',
      borderRadius: '0'
    }
  };
  const modifiersClassNames = {
    past: 'day-past'
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
        <div className="calendar-stretch bg-card border border-border p-4 flex items-stretch justify-center min-h-[400px]">
          <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={modifiers}
          modifiersStyles={modifiersStyles}
          modifiersClassNames={modifiersClassNames}
          disablePastDates={false}
          className="pointer-events-auto w-full h-full font-semibold" />

        </div>

        {/* Events on selected date */}
        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm text-primary tracking-widest font-semibold">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy').toUpperCase() : 'SELECT A DATE'}
            </h2>
            {canCreateEvent && <Button size="icon" onClick={handleCreateEventClick} className="bg-primary hover:bg-primary/90 h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>}
          </div>
          
          {gigsOnSelectedDate.length === 0 ? <p className="text-muted-foreground text-sm">No shows on this date</p> : <div className="space-y-4">
              {/* Confirmed Shows */}
              {confirmedGigs.length > 0 && <div className="space-y-2">
                  <p className="font-display text-xs text-green-500 tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    CONFIRMED
                  </p>
                  {confirmedGigs.map((gig) => {
              const isManual = !gig.application_id && gig.manual_venue_name;
              const venueName = isManual ? gig.manual_venue_name : gig.venue_listing?.room_name ? `${gig.venue_listing.room_name} at ${gig.venue_listing.venue_name}` : gig.venue_listing?.venue_name || 'Venue';
              const location = isManual ? gig.manual_location : gig.venue_listing?.location;
              const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
              return <button key={gig.id} onClick={() => navigate(`/artist/calendar/${gig.id}`)} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                        <p className="font-display text-primary text-base">{venueName}</p>
                        {(location || timeDisplay) && <p className="text-sm text-muted-foreground">{[location, timeDisplay].filter(Boolean).join(' · ')}</p>}
                      </button>;
            })}
                </div>}

              {/* Holds */}
              {holdGigs.length > 0 && <div className="space-y-2">
                  <p className="font-display text-xs text-yellow-500 tracking-widest flex items-center gap-1">
                    <PauseCircle className="h-3 w-3" />
                    HOLDS
                  </p>
                  {holdGigs.map((gig) => {
              const isManual = !gig.application_id && gig.manual_venue_name;
              const venueName = isManual ? gig.manual_venue_name : gig.venue_listing?.room_name ? `${gig.venue_listing.room_name} at ${gig.venue_listing.venue_name}` : gig.venue_listing?.venue_name || 'Venue';
              const location = isManual ? gig.manual_location : gig.venue_listing?.location;
              const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
              return <button key={gig.id} onClick={() => {
                if (gig.application_id) {
                  navigate(`/artist/applications/${gig.application_id}`);
                }
              }} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 font-display">
                            HOLD #{gig.hold_priority || '—'}
                          </span>
                          <p className="font-display text-primary text-base">{venueName}</p>
                        </div>
                        {(location || timeDisplay) && <p className="text-sm text-muted-foreground">{[location, timeDisplay].filter(Boolean).join(' · ')}</p>}
                      </button>;
            })}
                </div>}
            </div>}
        </div>
      </div>

      {/* Upcoming confirmed shows */}
      <div className="bg-card border border-border p-6">
        <h2 className="font-display text-sm text-primary tracking-widest mb-4 font-semibold">UPCOMING SHOWS</h2>
        {gigs.filter((g) => parseLocalDate(g.gig_date) >= new Date() && g.is_confirmed).length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-2">
            {gigs.filter((g) => parseLocalDate(g.gig_date) >= new Date() && g.is_confirmed).map((gig) => {
          const isManual = !gig.application_id && gig.manual_venue_name;
          const venueName = isManual ? gig.manual_venue_name : gig.venue_listing?.room_name ? `${gig.venue_listing.room_name} at ${gig.venue_listing.venue_name}` : gig.venue_listing?.venue_name || 'Venue';
          const location = isManual ? gig.manual_location : gig.venue_listing?.location;
          const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
          return <button key={gig.id} onClick={() => navigate(`/artist/calendar/${gig.id}`)} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                  <div>
                    <p className="font-display text-primary">{venueName}</p>
                    {(location || timeDisplay) && <p className="text-xs text-muted-foreground">{[location, timeDisplay].filter(Boolean).join(' · ')}</p>}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(parseLocalDate(gig.gig_date), 'MMM d, yyyy')}
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
                <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="pl-10" />
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Venue Name */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">
                VENUE NAME <span className="text-destructive">*</span>
              </label>
              <Input value={eventVenueName} onChange={(e) => setEventVenueName(e.target.value)} placeholder="Enter venue name" />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">
                LOCATION <span className="text-destructive">*</span>
              </label>
              <LocationAutocomplete value={eventLocation} onChange={setEventLocation} placeholder="Search for location" />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateEvent} disabled={creating || !eventDate || !eventVenueName.trim() || !eventLocation.trim()} className="bg-primary hover:bg-primary/90">
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}