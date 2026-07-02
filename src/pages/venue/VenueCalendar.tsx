import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarIcon, Clock, Plus, CheckCircle2, Trash2, PauseCircle, GripVertical, ChevronDown, Pencil } from 'lucide-react';
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
  notes: string | null;
  openers: string[] | null;
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
  const [selectedArtistUserId, setSelectedArtistUserId] = useState<string | null>(null);
  const [artistSuggestions, setArtistSuggestions] = useState<Array<{ user_id: string; band_name: string | null; first_name: string | null; last_name: string | null }>>([]);
  const [artistSearchOpen, setArtistSearchOpen] = useState(false);
  const [eventIsHold, setEventIsHold] = useState(false);
  const [eventHoldPriority, setEventHoldPriority] = useState(1);
  const [existingHoldsForDate, setExistingHoldsForDate] = useState<GigListing[]>([]);
  const [creating, setCreating] = useState(false);
  const [draggedHoldIndex, setDraggedHoldIndex] = useState<number | null>(null);
  const [localHoldOrder, setLocalHoldOrder] = useState<GigListing[]>([]);
  const [confirmDropHighlight, setConfirmDropHighlight] = useState(false);
  const [isDraggingHold, setIsDraggingHold] = useState(false);
  const confirmDroppedRef = useRef(false);

  // Event preview dialog state
  const [previewGig, setPreviewGig] = useState<GigListing | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewEditing, setPreviewEditing] = useState(false);
  const [previewEditDate, setPreviewEditDate] = useState<Date | undefined>(undefined);
  const [previewEditTime, setPreviewEditTime] = useState('');
  const [previewEditStatus, setPreviewEditStatus] = useState<'confirmed' | 'hold'>('confirmed');
  const [previewEditHoldPriority, setPreviewEditHoldPriority] = useState(1);
  const [previewEditArtistName, setPreviewEditArtistName] = useState('');
  const [previewEditNotes, setPreviewEditNotes] = useState('');
  const [previewEditOpeners, setPreviewEditOpeners] = useState<string[]>([]);
  const [previewSaving, setPreviewSaving] = useState(false);
  const [previewDatePickerOpen, setPreviewDatePickerOpen] = useState(false);

  // Delete hold dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [holdToDelete, setHoldToDelete] = useState<{ gigId: string; applicationId: string | null; artistId: string; artistName: string } | null>(null);
  const [deletingHold, setDeletingHold] = useState(false);

  // Confirm hold dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmingHold, setConfirmingHold] = useState(false);
  const [confirmShowTime, setConfirmShowTime] = useState('');
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
  // Debounced artist search for the create-event dialog
  useEffect(() => {
    if (!createDialogOpen) return;
    const query = eventArtistName.trim();
    if (query.length < 1 || selectedArtistUserId) {
      setArtistSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const { data: artistRows } = await supabase
        .from('artist_profiles')
        .select('user_id, band_name')
        .ilike('band_name', `%${query}%`)
        .not('band_name', 'is', null)
        .limit(8);
      const userIds = (artistRows || []).map(r => r.user_id);
      let profilesMap: Record<string, { first_name: string | null; last_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        (profs || []).forEach(p => { profilesMap[p.id] = { first_name: p.first_name, last_name: p.last_name }; });
      }
      setArtistSuggestions((artistRows || []).map(r => ({
        user_id: r.user_id,
        band_name: r.band_name,
        first_name: profilesMap[r.user_id]?.first_name ?? null,
        last_name: profilesMap[r.user_id]?.last_name ?? null,
      })));
    }, 200);
    return () => clearTimeout(handle);
  }, [eventArtistName, createDialogOpen, selectedArtistUserId]);
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
      setGigs(enrichedGigs as GigListing[]);
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
      setExistingHoldsForDate((holds || []) as GigListing[]);
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
      artist_id: selectedArtistUserId || user!.id,
      // If a platform artist was picked, link them; otherwise use venue user as placeholder for manual events
      gig_date: format(eventDate, 'yyyy-MM-dd'),
      show_time: eventTime || null,
      notes: null,
      openers: [],
      manual_artist_name: selectedArtistUserId ? null : (eventArtistName.trim() || null),
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
    const formattedDate = format(parseLocalDate(gigDate), 'MMMM d, yyyy');
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
    setConfirmShowTime('');
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
    const formattedDate = format(parseLocalDate(gigDate), 'MMMM d, yyyy');

    // Confirm this gig
    const {
      error: confirmError
    } = await supabase.from('gig_listings').update({
      is_confirmed: true,
      hold_priority: null,
      ...(confirmShowTime ? { show_time: confirmShowTime } : {})
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
  const gigDates = gigs.map(g => parseLocalDate(g.gig_date));
  const gigsOnSelectedDate = selectedDate ? gigs.filter(g => format(parseLocalDate(g.gig_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];
  const confirmedGigs = gigsOnSelectedDate.filter(g => g.is_confirmed);
  const holdGigs = gigsOnSelectedDate.filter(g => !g.is_confirmed).sort((a, b) => (a.hold_priority || 99) - (b.hold_priority || 99));

  // Sync local hold order when holdGigs change
  useEffect(() => {
    setLocalHoldOrder(holdGigs);
  }, [gigs, selectedDate]);
  const handleHoldDragStart = (index: number) => {
    setDraggedHoldIndex(index);
    setIsDraggingHold(true);
    confirmDroppedRef.current = false;
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
    setIsDraggingHold(false);
    setConfirmDropHighlight(false);

    // If the hold was dropped into the confirm zone, skip reorder save
    if (confirmDroppedRef.current) {
      confirmDroppedRef.current = false;
      return;
    }

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
    past: {
      before: today
    }
  };
  const modifiersStyles = {
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
        <div className="calendar-stretch bg-card border border-border p-4 flex items-stretch min-h-[400px]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={modifiers}
            modifiersStyles={modifiersStyles}
            disablePastDates={false}
            className="pointer-events-auto w-full h-full font-semibold p-0"
            classNames={{
              months: "flex flex-col h-full w-full flex-1",
              month: "flex flex-col h-full w-full flex-1",
              table: "flex flex-col flex-1 w-full border-collapse",
              head_row: "flex w-full",
              head_cell: "flex-1 text-muted-foreground font-normal text-[0.8rem] text-center",
              row: "flex w-full flex-1",
              cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/30 [&:has([aria-selected])]:bg-accent/60 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: "w-full h-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent/60 hover:text-accent-foreground inline-flex items-center justify-center rounded-md text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            }}
          />
        </div>

        {/* Events on selected date */}
        <div className="bg-card border border-border p-6 max-h-[400px] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-sm text-primary tracking-widest font-semibold">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy').toUpperCase() : 'SELECT A DATE'}
            </h2>
            {canCreateEvent && <Button size="icon" onClick={handleCreateEventClick} className="bg-primary hover:bg-primary/90 h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>}
          </div>
          
          <div className="space-y-4">
              {/* Confirmed Shows - always visible */}
              <div className="space-y-2">
                <p className="font-display text-xs tracking-widest flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3 w-3" />
                  CONFIRMED
                </p>
                {confirmedGigs.map(gig => {
                  const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
                  const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
                  const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
                  return <button key={gig.id} onClick={() => { setPreviewGig(gig); setPreviewDialogOpen(true); }} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                    <p className="font-display text-primary text-base">{artistName}</p>
                    <p className="text-sm text-muted-foreground">{roomDisplay}{timeDisplay ? ` · ${timeDisplay}` : ''}</p>
                  </button>;
                })}
                <div
                  onDragOver={e => { e.preventDefault(); e.stopPropagation(); setConfirmDropHighlight(true); }}
                  onDragLeave={() => setConfirmDropHighlight(false)}
                  onDrop={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setConfirmDropHighlight(false);
                    if (draggedHoldIndex !== null) {
                      const gig = localHoldOrder[draggedHoldIndex];
                      if (gig) {
                        confirmDroppedRef.current = true;
                        setDraggedHoldIndex(null);
                        setIsDraggingHold(false);
                        openConfirmDialog(gig.id, gig.gig_date, gig.venue_listing_id, gig.artist_id);
                      }
                    }
                  }}
                  className={`transition-all rounded-sm ${confirmDropHighlight ? 'min-h-[72px] bg-green-600/20 border-2 border-dashed border-green-600 py-4 flex items-center justify-center' : isDraggingHold ? 'min-h-[56px] border-2 border-dashed border-green-600/40 py-3 flex items-center justify-center' : confirmedGigs.length === 0 ? 'min-h-[40px]' : 'min-h-0 h-2'}`}
                >
                  {confirmedGigs.length === 0 && !confirmDropHighlight && !isDraggingHold && (
                    <p className="text-muted-foreground text-sm py-2 px-2">No Artists Confirmed Yet</p>
                  )}
                  {isDraggingHold && !confirmDropHighlight && (
                    <p className="text-green-600/60 text-xs font-display tracking-widest">DROP HERE TO CONFIRM</p>
                  )}
                  {confirmDropHighlight && (
                    <p className="text-green-600 text-xs font-display tracking-widest font-bold">RELEASE TO CONFIRM</p>
                  )}
                </div>
              </div>

              {/* Holds */}
              {holdGigs.length > 0 && <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xs tracking-widest flex items-center gap-1 text-yellow-500">
                      <PauseCircle className="h-3 w-3" />
                      HOLDS
                    </p>
                  </div>
                  {localHoldOrder.map((gig, index) => {
              const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
              const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
              const timeDisplay = gig.show_time ? new Date(`2000-01-01T${gig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase() : null;
              return <div key={gig.id} draggable onDragStart={() => handleHoldDragStart(index)} onDragOver={e => handleHoldDragOver(e, index)} onDragEnd={handleHoldDragEnd} className={`bg-secondary p-4 flex items-center justify-between cursor-grab active:cursor-grabbing transition-opacity ${draggedHoldIndex === index ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-3 flex-1">
                          <button onClick={() => {
                    setPreviewGig(gig);
                    setPreviewDialogOpen(true);
                  }} className="text-left flex-1 hover:opacity-80 transition-opacity">
                            <div className="flex items-center">
                              <span className="inline-flex items-center justify-center text-primary text-xs font-bold mr-1.5 flex-shrink-0 font-display">#{index + 1}</span>
                              <span className="font-display text-primary text-base">{artistName}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{roomDisplay}{timeDisplay ? ` · ${timeDisplay}` : ''}</p>
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
        {gigs.filter(g => parseLocalDate(g.gig_date) >= new Date() && g.is_confirmed).length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-2">
            {gigs.filter(g => parseLocalDate(g.gig_date) >= new Date() && g.is_confirmed).map(gig => {
          const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
          const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
          return <button key={gig.id} onClick={() => { setPreviewGig(gig); setPreviewDialogOpen(true); }} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                  <div>
                    <p className="font-display text-primary">{artistName}</p>
                    <p className="text-xs text-muted-foreground">{roomDisplay}</p>
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
                <Input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} className="pl-10" />
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Artist Name */}
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


      {/* Confirm Hold Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">CONFIRM GIG</DialogTitle>
          </DialogHeader>
          
          {holdToConfirm && <div className="space-y-6 py-4">
              <p className="text-primary">
                Confirm <span className="font-medium text-primary">{holdToConfirm.artistName}</span> for {holdToConfirm.roomName} on {format(parseLocalDate(holdToConfirm.gigDate), 'MMMM d, yyyy')}?
              </p>

              {holdToConfirm.artistOtherHoldIds.length > 0 && <p className="text-sm text-muted-foreground">
                  This will also remove {holdToConfirm.artistOtherHoldIds.length} other hold{holdToConfirm.artistOtherHoldIds.length !== 1 ? 's' : ''} for this artist.
                </p>}

              {/* Show Time */}
              <div className="space-y-2">
                <label className="font-display text-xs text-primary tracking-widest">SHOW TIME</label>
                <Input type="time" value={confirmShowTime} onChange={e => setConfirmShowTime(e.target.value)} className="w-40" />
              </div>

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

      {/* Event Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={(open) => { setPreviewDialogOpen(open); if (!open) setPreviewEditing(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="pr-12">
            <DialogTitle className="font-display text-2xl flex items-center justify-between sr-only">
              Event Details
            </DialogTitle>
            <DialogDescription className="sr-only">Event details</DialogDescription>
          </DialogHeader>
          {previewGig && (() => {
            const pArtistName = previewGig.manual_artist_name || previewGig.artist_profile?.band_name || (previewGig.artist ? `${previewGig.artist.first_name} ${previewGig.artist.last_name}` : 'TBA');
            const pRoomDisplay = previewGig.venue_listing?.room_name || previewGig.venue_listing?.venue_name || '';
            const pTimeDisplay = previewGig.show_time ? new Date(`2000-01-01T${previewGig.show_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : null;
            const pDateDisplay = format(parseLocalDate(previewGig.gig_date), 'EEEE, MMMM d, yyyy');
            return (
              <div className="space-y-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">HEADLINER</p>
                    {previewEditing && !previewGig.application_id ? (
                      <Input
                        value={previewEditArtistName}
                        onChange={e => setPreviewEditArtistName(e.target.value)}
                        placeholder="Artist or event name"
                        className="font-display text-lg"
                      />
                    ) : (
                      <p className="font-display text-2xl text-accent font-bold">{pArtistName}</p>
                    )}
                  </div>
                  {!previewEditing && (
                    <Button size="icon" variant="ghost" onClick={() => {
                      if (previewGig) {
                        setPreviewEditDate(parseLocalDate(previewGig.gig_date));
                        setPreviewEditTime(previewGig.show_time || '');
                        setPreviewEditStatus(previewGig.is_confirmed ? 'confirmed' : 'hold');
                        setPreviewEditHoldPriority(previewGig.hold_priority || 1);
                        setPreviewEditArtistName(
                          previewGig.manual_artist_name ||
                            previewGig.artist_profile?.band_name ||
                            (previewGig.artist ? `${previewGig.artist.first_name} ${previewGig.artist.last_name}` : '')
                        );
                        setPreviewEditNotes(previewGig.notes || '');
                        setPreviewEditOpeners((previewGig.openers || []) as string[]);
                        setPreviewEditing(true);
                      }
                    }} className="h-8 w-8 mt-4">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {!previewEditing && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-display tracking-widest rounded-sm ${previewGig.is_confirmed ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                  {previewGig.is_confirmed ? <CheckCircle2 className="h-3 w-3" /> : <PauseCircle className="h-3 w-3" />}
                  {previewGig.is_confirmed ? 'CONFIRMED' : `HOLD #${previewGig.hold_priority || '?'}`}
                </div>
                )}

                {previewEditing && (
                  <div>
                    <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">STATUS</p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={previewEditStatus === 'confirmed' ? 'default' : 'outline'}
                        className={previewEditStatus === 'confirmed' ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
                        onClick={() => setPreviewEditStatus('confirmed')}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={previewEditStatus === 'hold' ? 'default' : 'outline'}
                        className={previewEditStatus === 'hold' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : ''}
                        onClick={() => setPreviewEditStatus('hold')}
                      >
                        <PauseCircle className="h-3 w-3 mr-1" /> Hold
                      </Button>
                    </div>
                    {previewEditStatus === 'hold' && (
                      <div className="mt-2">
                        <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">HOLD PRIORITY</p>
                        <Input
                          type="number"
                          min={1}
                          value={previewEditHoldPriority}
                          onChange={e => setPreviewEditHoldPriority(parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Openers */}
                {(previewEditing || (previewGig.openers && previewGig.openers.length > 0)) && (
                  <div>
                    <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">OPENERS</p>
                    {previewEditing ? (
                      <div className="space-y-2">
                        {previewEditOpeners.map((opener, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Input
                              value={opener}
                              onChange={e => {
                                const newOpeners = [...previewEditOpeners];
                                newOpeners[index] = e.target.value;
                                setPreviewEditOpeners(newOpeners);
                              }}
                              placeholder={`Opener ${index + 1}`}
                              className="text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive hover:text-destructive h-8 w-8 shrink-0"
                              onClick={() => {
                                const newOpeners = [...previewEditOpeners];
                                newOpeners.splice(index, 1);
                                setPreviewEditOpeners(newOpeners);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewEditOpeners([...previewEditOpeners, ''])}
                          className="w-full"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add Opener
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(previewGig.openers || []).map((opener, index) => (
                          <span key={index} className="text-sm text-primary bg-secondary px-2 py-1 rounded">
                            {opener}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  {previewEditing ? (
                    <Popover open={previewDatePickerOpen} onOpenChange={setPreviewDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !previewEditDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {previewEditDate ? format(previewEditDate, 'EEEE, MMMM d, yyyy') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={previewEditDate}
                          onSelect={(date) => { if (date) { setPreviewEditDate(date); setPreviewDatePickerOpen(false); } }}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <div className="flex items-center gap-2 text-primary">
                      <CalendarIcon className="h-4 w-4" />
                      <p className="text-sm">{pDateDisplay}</p>
                    </div>
                  )}
                </div>

                {(previewEditing || pTimeDisplay) && (
                  <div>
                    <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">TIME</p>
                    {previewEditing ? (
                      <div className="relative">
                        <Input type="time" value={previewEditTime} onChange={e => setPreviewEditTime(e.target.value)} className="pl-10 [&::-webkit-calendar-picker-indicator]:hidden" />
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-primary">
                        <Clock className="h-4 w-4" />
                        <p className="text-sm">{pTimeDisplay}</p>
                      </div>
                    )}
                  </div>
                )}

                {pRoomDisplay && (
                  <div>
                    <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">ROOM</p>
                    <p className="text-sm text-primary">{pRoomDisplay}</p>
                  </div>
                )}

                {(previewEditing || previewGig.notes) && (
                  <div>
                    <p className="font-display text-xs text-muted-foreground tracking-widest mb-1">NOTES</p>
                    {previewEditing ? (
                      <Textarea
                        value={previewEditNotes}
                        onChange={e => setPreviewEditNotes(e.target.value)}
                        placeholder="Add notes about this show..."
                        className="min-h-[80px] text-sm"
                      />
                    ) : (
                      <p className="text-sm text-primary whitespace-pre-wrap">{previewGig.notes}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 px-3"
              onClick={async () => {
                if (!previewGig) return;
                const pArtistName = previewGig.manual_artist_name || previewGig.artist_profile?.band_name || (previewGig.artist ? `${previewGig.artist.first_name} ${previewGig.artist.last_name}` : 'this artist');
                if (!confirm(`Are you sure you want to delete the ${previewGig.is_confirmed ? 'gig' : 'hold'} for ${pArtistName}?`)) return;
                const { error } = await supabase.from('gig_listings').delete().eq('id', previewGig.id);
                if (error) { toast.error('Failed to delete'); return; }
                toast.success(`${previewGig.is_confirmed ? 'Gig' : 'Hold'} deleted`);
                setPreviewDialogOpen(false);
                fetchGigs();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Event
            </Button>
            <div className="flex gap-3">
              {previewEditing ? (
                <>
                  <Button variant="outline" onClick={() => setPreviewEditing(false)}>Cancel</Button>
                  <Button disabled={previewSaving} onClick={async () => {
                    if (!previewGig || !previewEditDate) return;
                    setPreviewSaving(true);
                    const updatePayload: any = {
                      gig_date: format(previewEditDate, 'yyyy-MM-dd'),
                      show_time: previewEditTime || null,
                      is_confirmed: previewEditStatus === 'confirmed',
                      hold_priority: previewEditStatus === 'hold' ? previewEditHoldPriority : null,
                      notes: previewEditNotes.trim() || null,
                      openers: previewEditOpeners.map(o => o.trim()).filter(Boolean),
                    };
                    if (!previewGig.application_id) {
                      updatePayload.manual_artist_name = previewEditArtistName.trim() || null;
                    }
                    const { error } = await supabase.from('gig_listings').update(updatePayload).eq('id', previewGig.id);
                    setPreviewSaving(false);
                    if (error) { toast.error('Failed to save'); return; }
                    toast.success('Event updated!');
                    setPreviewEditing(false);
                    setPreviewDialogOpen(false);
                    fetchGigs();
                  }} className="bg-primary hover:bg-primary/90">
                    {previewSaving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              ) : (
                <>
                  {previewGig?.application_id && (
                    <Button variant="outline" onClick={() => { setPreviewDialogOpen(false); navigate(`/venue/applications/${previewGig.application_id}`); }}>
                      View Application
                    </Button>
                  )}
                </>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}