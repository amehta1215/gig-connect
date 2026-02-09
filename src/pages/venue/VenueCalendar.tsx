import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, Clock, Plus, CheckCircle2, Trash2, PauseCircle, GripVertical, ChevronDown } from 'lucide-react';
import { format, startOfDay, addDays, addMonths } from 'date-fns';
import { toast } from 'sonner';
interface GigListing {
  id: string;
  gig_date: string;
  venue_listing_id: string;
  artist_id: string;
  application_id: string | null;
  manual_artist_name: string | null;
  show_time: string | null;
  is_confirmed: boolean;
  hold_priority: number | null;
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
  const [eventIsHold, setEventIsHold] = useState(false);
  const [eventHoldPriority, setEventHoldPriority] = useState(1);
  const [existingHoldsForDate, setExistingHoldsForDate] = useState<GigListing[]>([]);
  const [creating, setCreating] = useState(false);
  const [draggedHoldIndex, setDraggedHoldIndex] = useState<number | null>(null);
  const [localHoldOrder, setLocalHoldOrder] = useState<GigListing[]>([]);
  const [confirmDropHighlight, setConfirmDropHighlight] = useState(false);

  // Delete hold dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holdToDelete, setHoldToDelete] = useState<{ gigId: string; applicationId: string | null; artistId: string; artistName: string } | null>(null);
  const [deletingHold, setDeletingHold] = useState(false);

  // Confirm hold dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmingHold, setConfirmingHold] = useState(false);
  const [holdToConfirm, setHoldToConfirm] = useState<{
    gigId: string;
    gigDate: string;
    venueListingId: string;
    artistId: string;
    artistName: string;
    roomName: string;
    artistOtherHoldIds: string[];
    artistOtherApplicationIds: (string | null)[];
  } | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [sendConfirmMessage, setSendConfirmMessage] = useState(true);
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
  const handleCreateEventClick = async () => {
    setEventDate(selectedDate);
    setEventTime('');
    setEventArtistName('');
    setEventIsHold(false);
    setEventHoldPriority(1);
    setSelectedListingId(venueListings.length === 1 ? venueListings[0].id : '');

    // Fetch existing holds for this date
    if (selectedDate && venueListings.length > 0) {
      const listingIds = venueListings.map(l => l.id);
      const {
        data: holds
      } = await supabase.from('gig_listings').select('*').in('venue_listing_id', listingIds).eq('gig_date', format(selectedDate, 'yyyy-MM-dd')).eq('is_confirmed', false).order('hold_priority', {
        ascending: true
      });
      setExistingHoldsForDate(holds || []);
      setEventHoldPriority((holds?.length || 0) + 1);
    } else {
      setExistingHoldsForDate([]);
    }
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
      manual_artist_name: eventArtistName.trim() || null,
      is_confirmed: !eventIsHold,
      hold_priority: eventIsHold ? eventHoldPriority : null
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
  const openConfirmDialog = async (gigId: string, gigDate: string, venueListingId: string, artistId: string) => {
    // Get artist info
    const {
      data: artistProfile
    } = await supabase.from('artist_profiles').select('band_name').eq('user_id', artistId).maybeSingle();
    const {
      data: artist
    } = await supabase.from('profiles').select('first_name, last_name').eq('id', artistId).maybeSingle();
    const {
      data: venueListing
    } = await supabase.from('venue_listings').select('venue_name, room_name').eq('id', venueListingId).single();

    // Get the same artist's OTHER holds across all venue listings (not other artists' holds)
    const listingIds = venueListings.map(l => l.id);
    const {
      data: artistOtherHolds
    } = await supabase.from('gig_listings').select('id, application_id').in('venue_listing_id', listingIds).eq('artist_id', artistId).eq('is_confirmed', false).neq('id', gigId);
    const artistName = artistProfile?.band_name || (artist ? `${artist.first_name} ${artist.last_name}` : 'Artist');
    const roomName = venueListing?.room_name || venueListing?.venue_name || 'Venue';
    const formattedDate = format(new Date(gigDate), 'MMMM d, yyyy');
    setHoldToConfirm({
      gigId,
      gigDate,
      venueListingId,
      artistId,
      artistName,
      roomName,
      artistOtherHoldIds: (artistOtherHolds || []).map(h => h.id),
      artistOtherApplicationIds: (artistOtherHolds || []).map(h => h.application_id)
    });
    setConfirmMessage(`Great news! Your performance at ${roomName} on ${formattedDate} has been confirmed. This is no longer a hold - you're officially booked!\n\nWe're looking forward to having you perform.`);
    setSendConfirmMessage(true);
    setConfirmDialogOpen(true);
  };
  const handleConfirmHold = async () => {
    if (!holdToConfirm || !user) return;
    setConfirmingHold(true);
    const {
      gigId,
      gigDate,
      artistId,
      roomName,
      artistOtherHoldIds,
      artistOtherApplicationIds
    } = holdToConfirm;
    const formattedDate = format(new Date(gigDate), 'MMMM d, yyyy');

    // Confirm this gig
    const {
      error: confirmError
    } = await supabase.from('gig_listings').update({
      is_confirmed: true,
      hold_priority: null
    }).eq('id', gigId);
    if (confirmError) {
      toast.error('Failed to confirm gig');
      setConfirmingHold(false);
      return;
    }

    // Delete the confirmed artist's OTHER holds (other dates/listings), keep other artists' holds
    if (artistOtherHoldIds.length > 0) {
      const applicationIds = artistOtherApplicationIds.filter(Boolean) as string[];
      if (applicationIds.length > 0) {
        await supabase.from('applications').update({
          status: 'archived'
        }).in('id', applicationIds);
      }
      await supabase.from('gig_listings').delete().in('id', artistOtherHoldIds);
    }

    // Send confirmation message if enabled
    if (sendConfirmMessage && confirmMessage.trim()) {
      await supabase.from('messages').insert({
        thread_id: crypto.randomUUID(),
        sender_id: user.id,
        receiver_id: artistId,
        subject: `Gig Confirmed: ${roomName} on ${formattedDate}`,
        content: confirmMessage,
        is_read: false,
        is_starred: false
      });
    }
    setConfirmingHold(false);
    setConfirmDialogOpen(false);
    setHoldToConfirm(null);
    toast.success('Gig confirmed!');
    fetchGigs();
  };
  const openDeleteDialog = async (gig: GigListing) => {
    const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'Artist');
    setHoldToDelete({ gigId: gig.id, applicationId: gig.application_id, artistId: gig.artist_id, artistName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteHoldThisDay = async () => {
    if (!holdToDelete) return;
    setDeletingHold(true);
    const { error } = await supabase.from('gig_listings').delete().eq('id', holdToDelete.gigId);
    if (error) { toast.error('Failed to delete hold'); setDeletingHold(false); return; }
    if (holdToDelete.applicationId) {
      await supabase.from('applications').update({ status: 'archived' }).eq('id', holdToDelete.applicationId);
    }
    setDeletingHold(false);
    setDeleteDialogOpen(false);
    setHoldToDelete(null);
    toast.success('Hold deleted');
    fetchGigs();
  };

  const handleDeleteAllHoldsForArtist = async () => {
    if (!holdToDelete) return;
    setDeletingHold(true);
    const listingIds = venueListings.map(l => l.id);
    // Get all holds for this artist across all venue listings
    const { data: allHolds } = await supabase
      .from('gig_listings')
      .select('id, application_id')
      .in('venue_listing_id', listingIds)
      .eq('artist_id', holdToDelete.artistId)
      .eq('is_confirmed', false);
    if (allHolds && allHolds.length > 0) {
      const holdIds = allHolds.map(h => h.id);
      const appIds = allHolds.map(h => h.application_id).filter(Boolean) as string[];
      await supabase.from('gig_listings').delete().in('id', holdIds);
      if (appIds.length > 0) {
        await supabase.from('applications').update({ status: 'archived' }).in('id', appIds);
      }
    }
    setDeletingHold(false);
    setDeleteDialogOpen(false);
    setHoldToDelete(null);
    toast.success('All holds for this artist deleted');
    fetchGigs();
  };
  const gigDates = gigs.map(g => new Date(g.gig_date));
  const gigsOnSelectedDate = selectedDate ? gigs.filter(g => format(new Date(g.gig_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];
  const confirmedGigs = gigsOnSelectedDate.filter(g => g.is_confirmed);
  const holdGigs = gigsOnSelectedDate.filter(g => !g.is_confirmed).sort((a, b) => (a.hold_priority || 99) - (b.hold_priority || 99));

  // Sync local hold order when holdGigs change
  useEffect(() => {
    setLocalHoldOrder(holdGigs);
  }, [gigs, selectedDate]);
  const handleHoldDragStart = (index: number) => {
    setDraggedHoldIndex(index);
  };
  const handleHoldDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedHoldIndex === null || draggedHoldIndex === index) return;
    const newOrder = [...localHoldOrder];
    const draggedItem = newOrder[draggedHoldIndex];
    newOrder.splice(draggedHoldIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setLocalHoldOrder(newOrder);
    setDraggedHoldIndex(index);
  };
  const handleHoldDragEnd = async () => {
    setDraggedHoldIndex(null);

    // Check if order actually changed
    const orderChanged = localHoldOrder.some((gig, index) => gig.hold_priority !== index + 1);
    if (!orderChanged) return;

    // Update priorities in database
    const updates = localHoldOrder.map((gig, index) => ({
      id: gig.id,
      hold_priority: index + 1
    }));
    for (const update of updates) {
      await supabase.from('gig_listings').update({
        hold_priority: update.hold_priority
      }).eq('id', update.id);
    }
    toast.success('Hold order updated');
    fetchGigs();
  };
  const today = startOfDay(new Date());
  const modifiers = {
    hasGig: gigDates,
    past: {
      before: today
    }
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
        <div className="bg-card border border-border p-4 flex items-stretch justify-center min-h-[400px]">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} modifiers={modifiers} modifiersStyles={modifiersStyles} disablePastDates={false} className="pointer-events-auto w-full h-full [&_.rdp]:h-full [&_.rdp-months]:h-full [&_.rdp-month]:h-full [&_.rdp-month]:flex [&_.rdp-month]:flex-col [&_.rdp-month]:w-full [&_.rdp-table]:w-full [&_.rdp-table]:flex-1 [&_.rdp-tbody]:h-full [&_.rdp-head_row]:flex [&_.rdp-head_cell]:flex-1 [&_.rdp-head_cell]:flex [&_.rdp-head_cell]:items-center [&_.rdp-head_cell]:justify-center [&_.rdp-row]:flex [&_.rdp-row]:flex-1 [&_.rdp-cell]:flex-1 [&_.rdp-cell]:flex [&_.rdp-cell]:items-center [&_.rdp-cell]:justify-center [&_.rdp-day]:w-full [&_.rdp-day]:h-full font-semibold" />
        </div>

        {/* Events on selected date */}
        <div className="bg-card border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm text-primary tracking-widest font-semibold">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy').toUpperCase() : 'SELECT A DATE'}
            </h2>
            {canCreateEvent && <Button size="sm" onClick={handleCreateEventClick} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" />
                CREATE EVENT
              </Button>}
          </div>
          
          <div className="space-y-4">
              {/* Confirmed Shows - always visible */}
              <div className="space-y-2">
                <p className="font-display text-xs tracking-widest flex items-center gap-1 text-primary">
                  CONFIRMED
                </p>
                {confirmedGigs.map(gig => {
                  const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
                  const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
                  const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
                  return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                    <p className="font-display text-primary text-base">
                      {timeDisplay ? `${timeDisplay}: ` : ''}{artistName}
                    </p>
                    <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                  </button>;
                })}
                <div
                  onDragOver={e => { e.preventDefault(); setConfirmDropHighlight(true); }}
                  onDragLeave={() => setConfirmDropHighlight(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setConfirmDropHighlight(false);
                    if (draggedHoldIndex !== null) {
                      const gig = localHoldOrder[draggedHoldIndex];
                      if (gig) { setDraggedHoldIndex(null); openConfirmDialog(gig.id, gig.gig_date, gig.venue_listing_id, gig.artist_id); }
                    }
                  }}
                  className={`transition-all rounded-sm ${confirmDropHighlight ? 'min-h-[56px] bg-green-600/20 border-2 border-dashed border-green-600 py-4' : confirmedGigs.length === 0 ? 'min-h-[40px]' : 'min-h-0 h-2'}`}
                >
                  {confirmedGigs.length === 0 && !confirmDropHighlight && (
                    <p className="text-muted-foreground text-sm py-2 px-2">No Artists Confirmed Yet</p>
                  )}
                </div>
              </div>

              {/* Holds */}
              {holdGigs.length > 0 && <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xs tracking-widest flex items-center gap-1 text-primary">
                      HOLDS
                    </p>
                  </div>
                  {localHoldOrder.map((gig, index) => {
              const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
              const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
              return <div key={gig.id} draggable onDragStart={() => handleHoldDragStart(index)} onDragOver={e => handleHoldDragOver(e, index)} onDragEnd={handleHoldDragEnd} className={`bg-secondary p-4 flex items-center justify-between cursor-grab active:cursor-grabbing transition-opacity ${draggedHoldIndex === index ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3 flex-1">
                          <button onClick={() => {
                    if (gig.application_id) {
                      navigate(`/venue/applications/${gig.application_id}`);
                    } else {
                      navigate(`/venue/calendar/${gig.id}`);
                    }
                  }} className="text-left flex-1 hover:opacity-80 transition-opacity">
                            <div className="flex items-center">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-primary text-primary text-[10px] font-bold mr-2 flex-shrink-0">{index + 1}</span>
                              <span className="font-display text-primary text-base">{artistName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                          </button>
                        </div>
                        <div className="flex gap-1 ml-6">
                          <Button size="sm" variant="ghost" onClick={e => {
                    e.stopPropagation();
                    openDeleteDialog(gig);
                  }} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-3" />
                      </div>;
            })}
                </div>}
            </div>
        </div>
      </div>

      {/* Upcoming confirmed shows */}
      <div className="bg-card border border-border p-6">
        <h2 className="font-display text-sm text-primary tracking-widest mb-4 font-semibold">UPCOMING SHOWS</h2>
        {gigs.filter(g => new Date(g.gig_date) >= new Date() && g.is_confirmed).length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-2">
            {gigs.filter(g => new Date(g.gig_date) >= new Date() && g.is_confirmed).map(gig => {
          const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
          const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
          return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                  <div>
                    <p className="font-display text-primary">{artistName}</p>
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

            {/* Artist Name */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">ARTIST NAME <span className="text-destructive">*</span></label>
              <Input value={eventArtistName} onChange={e => setEventArtistName(e.target.value)} placeholder="Enter artist or event name" required />
            </div>

            {/* Hold or Confirmed */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">STATUS</label>
              <div className="flex gap-2">
                <Button type="button" variant={!eventIsHold ? 'default' : 'outline'} onClick={() => setEventIsHold(false)} className={!eventIsHold ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirmed
                </Button>
                <Button type="button" variant={eventIsHold ? 'default' : 'outline'} onClick={() => setEventIsHold(true)} className={eventIsHold ? 'bg-yellow-600 hover:bg-yellow-700 flex-1' : 'flex-1'}>
                  <PauseCircle className="h-4 w-4 mr-2" />
                  Hold
                </Button>
              </div>
            </div>

            {/* Hold Priority - only show if hold and existing holds exist */}
            {eventIsHold && existingHoldsForDate.length > 0 && <div className="space-y-2">
                <label className="font-display text-xs text-primary tracking-widest">HOLD PRIORITY</label>
                <div className="flex gap-2 flex-wrap">
                  {Array.from({
                length: existingHoldsForDate.length + 1
              }, (_, i) => i + 1).map(num => <Button key={num} type="button" size="sm" variant={eventHoldPriority === num ? 'default' : 'outline'} onClick={() => setEventHoldPriority(num)} className={eventHoldPriority === num ? 'bg-yellow-600 hover:bg-yellow-700' : ''}>
                      #{num}
                    </Button>)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {existingHoldsForDate.length} existing hold{existingHoldsForDate.length !== 1 ? 's' : ''} on this date
                </p>
              </div>}
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


      {/* Confirm Hold Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">CONFIRM GIG</DialogTitle>
          </DialogHeader>
          
          {holdToConfirm && <div className="space-y-6 py-4">
              <p className="text-primary">
                Confirm <span className="font-medium text-primary">{holdToConfirm.artistName}</span> for {holdToConfirm.roomName} on {format(new Date(holdToConfirm.gigDate), 'MMMM d, yyyy')}?
              </p>

              {holdToConfirm.artistOtherHoldIds.length > 0 && <p className="text-sm text-muted-foreground">
                  This will also remove {holdToConfirm.artistOtherHoldIds.length} other hold{holdToConfirm.artistOtherHoldIds.length !== 1 ? 's' : ''} for this artist.
                </p>}

              {/* Message to confirmed artist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-display text-xs text-primary tracking-widest">
                    MESSAGE TO {holdToConfirm.artistName.toUpperCase()}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={sendConfirmMessage} onChange={e => setSendConfirmMessage(e.target.checked)} className="rounded border-border" />
                    Send message
                  </label>
                </div>
                <Textarea value={confirmMessage} onChange={e => setConfirmMessage(e.target.value)} disabled={!sendConfirmMessage} className="min-h-[120px] text-sm" placeholder="Message to the confirmed artist..." />
              </div>
            </div>}

          <DialogFooter className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmHold} disabled={confirmingHold} className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {confirmingHold ? 'Confirming...' : 'Confirm Gig'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Hold Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">DELETE HOLD</DialogTitle>
            <DialogDescription>
              {holdToDelete && `Remove hold for ${holdToDelete.artistName}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Button
              variant="outline"
              onClick={handleDeleteHoldThisDay}
              disabled={deletingHold}
              className="w-full justify-start"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deletingHold ? 'Deleting...' : 'Delete hold for this date only'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteAllHoldsForArtist}
              disabled={deletingHold}
              className="w-full justify-start text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deletingHold ? 'Deleting...' : 'Delete all holds for this artist'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}