import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, Plus, CheckCircle2, PauseCircle, MapPin, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  venue_user_id?: string | null;
}
export default function ArtistCalendar() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<GigListing[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  const [showsPage, setShowsPage] = useState(1);
  const SHOWS_PER_PAGE = 5;

  // Create event dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [eventTime, setEventTime] = useState('');
  const [eventVenueName, setEventVenueName] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [creating, setCreating] = useState(false);

  // Event preview dialog state (read-only)
  const [previewGig, setPreviewGig] = useState<GigListing | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
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
      // Fetch venue listing info and venue user id for each gig
      const enrichedGigs = await Promise.all(gigsData.map(async (gig) => {
        const {
          data: venueListing
        } = await supabase.from('venue_listings').select(`
            venue_name,
            room_name,
            location,
            venue_profile:venue_profiles!venue_listings_venue_profile_id_fkey(user_id)
          `).eq('id', gig.venue_listing_id).maybeSingle();
        return {
          ...gig,
          venue_listing: venueListing ? {
            venue_name: venueListing.venue_name,
            room_name: venueListing.room_name,
            location: venueListing.location
          } : undefined,
          venue_user_id: (venueListing as any)?.venue_profile?.user_id || null
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
              return <button key={gig.id} onClick={() => { setPreviewGig(gig); setPreviewDialogOpen(true); }} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
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
              return <button key={gig.id} onClick={() => { setPreviewGig(gig); setPreviewDialogOpen(true); }} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
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
      {(() => {
        const upcomingGigs = gigs
          .filter((g) => parseLocalDate(g.gig_date) >= new Date())
          .sort((a, b) => (b.is_confirmed ? 1 : 0) - (a.is_confirmed ? 1 : 0));
        const totalPages = Math.ceil(upcomingGigs.length / SHOWS_PER_PAGE);
        const paginatedGigs = upcomingGigs.slice(0, showsPage * SHOWS_PER_PAGE);
        return (
          <div className="bg-card border border-border p-6">
            <h2 className="font-display text-sm text-primary tracking-widest mb-4 font-semibold">UPCOMING SHOWS</h2>
            {upcomingGigs.length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-2">
                {paginatedGigs.map((gig) => {
              const isManual = !gig.application_id && gig.manual_venue_name;
              const venueName = isManual ? gig.manual_venue_name : gig.venue_listing?.room_name ? `${gig.venue_listing.room_name} at ${gig.venue_listing.venue_name}` : gig.venue_listing?.venue_name || 'Venue';
              const location = isManual ? gig.manual_location : gig.venue_listing?.location;
              const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
              return <button key={gig.id} onClick={() => { setPreviewGig(gig); setPreviewDialogOpen(true); }} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                      <div className="flex items-center gap-2">
                        {gig.is_confirmed ? (
                          <span className="text-xs bg-green-500/20 text-green-500 px-1.5 py-0.5 font-display whitespace-nowrap">CONFIRMED</span>
                        ) : (
                          <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 font-display whitespace-nowrap">HOLD</span>
                        )}
                        <div>
                          <p className="font-display text-primary">{venueName}</p>
                          {(location || timeDisplay) && <p className="text-xs text-muted-foreground">{[location, timeDisplay].filter(Boolean).join(' · ')}</p>}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground whitespace-nowrap ml-2">
                        {format(parseLocalDate(gig.gig_date), 'MMM d, yyyy')}
                      </span>
                    </button>;
            })}
                {showsPage < totalPages && (
                  <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm mt-2" onClick={() => setShowsPage(p => p + 1)}>
                    Show More ({upcomingGigs.length - paginatedGigs.length} remaining)
                  </Button>
                )}
                {showsPage > 1 && (
                  <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground text-sm" onClick={() => setShowsPage(1)}>
                    Show Less
                  </Button>
                )}
              </div>}
          </div>
        );
      })()}

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">ADD GIG DETAILS</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            

            {/* Date (editable) */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">DATE <span className="text-destructive">*</span></label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, 'MMMM do, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={setEventDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
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

      {/* Event Preview Dialog (read-only) */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-12">
            <DialogTitle className="sr-only">Event Details</DialogTitle>
            <DialogDescription className="sr-only">Event details</DialogDescription>
          </DialogHeader>
          {previewGig && (() => {
            const isManual = !previewGig.application_id && previewGig.manual_venue_name;
            const pVenueName = isManual ? previewGig.manual_venue_name : previewGig.venue_listing?.room_name ? `${previewGig.venue_listing.room_name} at ${previewGig.venue_listing.venue_name}` : previewGig.venue_listing?.venue_name || 'Venue';
            const pLocation = isManual ? previewGig.manual_location : previewGig.venue_listing?.location;
            const pTimeDisplay = previewGig.show_time ? new Date(`2000-01-01T${previewGig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : null;
            const pDateDisplay = format(parseLocalDate(previewGig.gig_date), 'EEEE, MMMM d, yyyy');
            return (
              <div className="space-y-4 py-2">
                <div>
                  <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">VENUE</p>
                  <p className="font-display text-2xl text-accent font-bold">{pVenueName}</p>
                </div>

                <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-display tracking-widest rounded-sm ${previewGig.is_confirmed ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {previewGig.is_confirmed ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                  {previewGig.is_confirmed ? 'CONFIRMED' : `HOLD #${previewGig.hold_priority || '?'}`}
                </div>

                <div className="flex items-center gap-2 text-primary">
                  <CalendarIcon className="h-4 w-4" />
                  <p className="text-sm">{pDateDisplay}</p>
                </div>

                {pTimeDisplay && (
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="h-4 w-4" />
                    <p className="text-sm">{pTimeDisplay}</p>
                  </div>
                )}

                {pLocation && (
                  <div className="flex items-center gap-2 text-primary">
                    <MapPin className="h-4 w-4" />
                    <p className="text-sm">{pLocation}</p>
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter>
            {previewGig?.application_id && (
              <Button variant="outline" onClick={() => { setPreviewDialogOpen(false); navigate(`/artist/applications/${previewGig.application_id}`); }}>
                View Application
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}