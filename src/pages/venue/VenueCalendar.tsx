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
  const [deleteAllHoldsDialogOpen, setDeleteAllHoldsDialogOpen] = useState(false);
  const [deletingAllHolds, setDeletingAllHolds] = useState(false);
  const [deleteScope, setDeleteScope] = useState<'week' | 'month' | 'all'>('week');
  const [draggedHoldIndex, setDraggedHoldIndex] = useState<number | null>(null);
  const [localHoldOrder, setLocalHoldOrder] = useState<GigListing[]>([]);

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
    otherHolds: {
      id: string;
      artistId: string;
      artistName: string;
      applicationId: string | null;
    }[];
  } | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [declineMessage, setDeclineMessage] = useState('');
  const [sendConfirmMessage, setSendConfirmMessage] = useState(true);
  const [sendDeclineMessage, setSendDeclineMessage] = useState(true);
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

    // Get other holds for the same date
    const {
      data: otherHoldsData
    } = await supabase.from('gig_listings').select('id, artist_id, application_id').eq('venue_listing_id', venueListingId).eq('gig_date', gigDate).eq('is_confirmed', false).neq('id', gigId);

    // Enrich other holds with artist names
    const otherHolds = await Promise.all((otherHoldsData || []).map(async hold => {
      const {
        data: holdArtistProfile
      } = await supabase.from('artist_profiles').select('band_name').eq('user_id', hold.artist_id).maybeSingle();
      const {
        data: holdArtist
      } = await supabase.from('profiles').select('first_name, last_name').eq('id', hold.artist_id).maybeSingle();
      return {
        id: hold.id,
        artistId: hold.artist_id,
        artistName: holdArtistProfile?.band_name || (holdArtist ? `${holdArtist.first_name} ${holdArtist.last_name}` : 'Artist'),
        applicationId: hold.application_id
      };
    }));
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
      otherHolds
    });

    // Set default messages
    setConfirmMessage(`Great news! Your performance at ${roomName} on ${formattedDate} has been confirmed. This is no longer a hold - you're officially booked!\n\nWe're looking forward to having you perform.`);
    if (otherHolds.length > 0) {
      setDeclineMessage(`We appreciate your interest in performing at ${roomName} on ${formattedDate}. Unfortunately, we've decided to go with another artist for this date.\n\nWe hope to work with you in the future and encourage you to apply for other dates.`);
    }
    setSendConfirmMessage(true);
    setSendDeclineMessage(otherHolds.length > 0);
    setConfirmDialogOpen(true);
  };
  const handleConfirmHold = async () => {
    if (!holdToConfirm || !user) return;
    setConfirmingHold(true);
    const {
      gigId,
      gigDate,
      venueListingId,
      artistId,
      artistName,
      roomName,
      otherHolds
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

    // Handle other holds
    if (otherHolds.length > 0) {
      // Archive the applications for deleted holds
      const applicationIds = otherHolds.map(h => h.applicationId).filter(Boolean);
      if (applicationIds.length > 0) {
        await supabase.from('applications').update({
          status: 'archived'
        }).in('id', applicationIds);
      }

      // Delete the other holds
      await supabase.from('gig_listings').delete().in('id', otherHolds.map(h => h.id));

      // Send decline messages if enabled
      if (sendDeclineMessage && declineMessage.trim()) {
        for (const hold of otherHolds) {
          await supabase.from('messages').insert({
            thread_id: crypto.randomUUID(),
            sender_id: user.id,
            receiver_id: hold.artistId,
            subject: `Update: ${roomName} on ${formattedDate}`,
            content: declineMessage,
            is_read: false,
            is_starred: false
          });
        }
      }
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
  const handleDeleteHold = async (gigId: string, applicationId: string | null) => {
    // Delete the gig listing
    const {
      error
    } = await supabase.from('gig_listings').delete().eq('id', gigId);
    if (error) {
      toast.error('Failed to delete hold');
      return;
    }

    // Archive the application
    if (applicationId) {
      await supabase.from('applications').update({
        status: 'archived'
      }).eq('id', applicationId);
    }
    toast.success('Hold deleted and application archived');
    fetchGigs();
  };
  const openDeleteHoldsDialog = (scope: 'week' | 'month' | 'all') => {
    setDeleteScope(scope);
    setDeleteAllHoldsDialogOpen(true);
  };
  const handleDeleteAllHolds = async () => {
    setDeletingAllHolds(true);

    // Get all venue listing IDs for this user
    const {
      data: venueProfile
    } = await supabase.from('venue_profiles').select('id').eq('user_id', user!.id).single();
    if (!venueProfile) {
      setDeletingAllHolds(false);
      return;
    }
    const {
      data: listings
    } = await supabase.from('venue_listings').select('id').eq('venue_profile_id', venueProfile.id);
    if (!listings) {
      setDeletingAllHolds(false);
      return;
    }
    const listingIds = listings.map(l => l.id);
    const today = new Date();

    // Build query based on scope
    let query = supabase.from('gig_listings').select('id, application_id').in('venue_listing_id', listingIds).eq('is_confirmed', false);
    if (deleteScope === 'week') {
      const weekEnd = format(addDays(today, 7), 'yyyy-MM-dd');
      query = query.gte('gig_date', format(today, 'yyyy-MM-dd')).lte('gig_date', weekEnd);
    } else if (deleteScope === 'month') {
      const monthEnd = format(addMonths(today, 1), 'yyyy-MM-dd');
      query = query.gte('gig_date', format(today, 'yyyy-MM-dd')).lte('gig_date', monthEnd);
    }
    // 'all' scope doesn't need date filtering

    const {
      data: holds
    } = await query;
    if (holds && holds.length > 0) {
      // Archive the applications
      const applicationIds = holds.map(h => h.application_id).filter(Boolean);
      if (applicationIds.length > 0) {
        await supabase.from('applications').update({
          status: 'archived'
        }).in('id', applicationIds);
      }

      // Delete the holds
      await supabase.from('gig_listings').delete().in('id', holds.map(h => h.id));
      const scopeText = deleteScope === 'week' ? 'this week' : deleteScope === 'month' ? 'this month' : '';
      toast.success(`${holds.length} hold${holds.length > 1 ? 's' : ''} deleted${scopeText ? ` for ${scopeText}` : ''}`);
    } else {
      toast.info('No holds to delete');
    }
    setDeletingAllHolds(false);
    setDeleteAllHoldsDialogOpen(false);
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
          
          {gigsOnSelectedDate.length === 0 ? <p className="text-muted-foreground text-sm">No events on this date</p> : <div className="space-y-4">
              {/* Confirmed Shows */}
              {confirmedGigs.length > 0 && <div className="space-y-2">
                  <p className="font-display text-xs text-green-500 tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    CONFIRMED
                  </p>
                  {confirmedGigs.map(gig => {
              const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
              const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
              return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                        <p className="font-display text-lg text-accent">{artistName}</p>
                        <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                      </button>;
            })}
                </div>}

              {/* Holds */}
              {holdGigs.length > 0 && <div className="space-y-2">
                  <p className="font-display text-xs text-yellow-500 tracking-widest flex items-center gap-1">
                    <PauseCircle className="h-3 w-3" />
                    HOLDS
                  </p>
                  {localHoldOrder.map((gig, index) => {
              const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
              const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
              return <div key={gig.id} draggable onDragStart={() => handleHoldDragStart(index)} onDragOver={e => handleHoldDragOver(e, index)} onDragEnd={handleHoldDragEnd} className={`bg-secondary p-4 flex items-center justify-between cursor-grab active:cursor-grabbing transition-opacity ${draggedHoldIndex === index ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <button onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="text-left flex-1 hover:opacity-80 transition-opacity">
                            <p className="font-display text-lg text-primary">
                              <span className="text-muted-foreground text-sm mr-2">#{index + 1}</span>
                              {artistName}
                            </p>
                            <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                          </button>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="ghost" onClick={e => {
                    e.stopPropagation();
                    handleDeleteHold(gig.id, gig.application_id);
                  }} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" onClick={e => {
                    e.stopPropagation();
                    openConfirmDialog(gig.id, gig.gig_date, gig.venue_listing_id, gig.artist_id);
                  }} className="bg-green-600 hover:bg-green-700 h-8 w-8">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>;
            })}
                </div>}
            </div>}
        </div>
      </div>

      {/* Upcoming gigs list */}
      <div className="bg-card border border-border p-6">
        <h2 className="font-display text-sm text-primary tracking-widest mb-4">UPCOMING SHOWS</h2>
        {gigs.filter(g => new Date(g.gig_date) >= new Date()).length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-6">
            {/* Confirmed Shows */}
            {gigs.filter(g => new Date(g.gig_date) >= new Date() && g.is_confirmed).length > 0 && <div className="space-y-2">
                <p className="font-display text-xs text-green-500 tracking-widest flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  CONFIRMED
                </p>
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

            {/* Holds */}
            {gigs.filter(g => new Date(g.gig_date) >= new Date() && !g.is_confirmed).length > 0 && <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xs text-yellow-500 tracking-widest flex items-center gap-1">
                    <PauseCircle className="h-3 w-3" />
                    HOLDS
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-xs text-destructive hover:text-destructive h-6 px-2">
                        Delete All Holds
                        <ChevronDown className="h-3 w-3 ml-1" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openDeleteHoldsDialog('week')}>
                        For this week
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteHoldsDialog('month')}>
                        For this month
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDeleteHoldsDialog('all')}>
                        All holds
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {gigs.filter(g => new Date(g.gig_date) >= new Date() && !g.is_confirmed).sort((a, b) => {
            // Sort by date first, then by hold priority
            const dateCompare = new Date(a.gig_date).getTime() - new Date(b.gig_date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return (a.hold_priority || 99) - (b.hold_priority || 99);
          }).map(gig => {
            const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
            const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
            return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                        <div>
                          <p className="font-display text-primary">
                            <span className="text-muted-foreground text-sm mr-2">#{gig.hold_priority || '—'}</span>
                            {artistName}
                          </p>
                          <p className="text-xs text-muted-foreground">{roomDisplay}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(gig.gig_date), 'MMM d, yyyy')}
                        </span>
                      </button>;
          })}
              </div>}
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

      {/* Delete All Holds Confirmation Dialog */}
      <Dialog open={deleteAllHoldsDialogOpen} onOpenChange={setDeleteAllHoldsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">DELETE HOLDS</DialogTitle>
            <DialogDescription>
              {deleteScope === 'week' && 'Delete all holds for the next 7 days.'}
              {deleteScope === 'month' && 'Delete all holds for the next 30 days.'}
              {deleteScope === 'all' && 'Delete all holds across all dates.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground">
              The associated applications will be moved to archived. This action cannot be undone.
            </p>
          </div>

          <DialogFooter className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteAllHoldsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteAllHolds} disabled={deletingAllHolds} variant="destructive">
              {deletingAllHolds ? 'Deleting...' : 'Delete Holds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Hold Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">CONFIRM GIG</DialogTitle>
          </DialogHeader>
          
          {holdToConfirm && <div className="space-y-6 py-4">
              <p className="text-muted-foreground">
                Confirm <span className="text-accent font-medium">{holdToConfirm.artistName}</span> for {holdToConfirm.roomName} on {format(new Date(holdToConfirm.gigDate), 'MMMM d, yyyy')}?
              </p>

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

              {/* Message to declined artists */}
              {holdToConfirm.otherHolds.length > 0 && <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="font-display text-xs text-primary tracking-widest">
                      MESSAGE TO DECLINED HOLDS ({holdToConfirm.otherHolds.length})
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={sendDeclineMessage} onChange={e => setSendDeclineMessage(e.target.checked)} className="rounded border-border" />
                      Send message
                    </label>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    This message will be sent to: {holdToConfirm.otherHolds.map(h => h.artistName).join(', ')}
                  </div>
                  <Textarea value={declineMessage} onChange={e => setDeclineMessage(e.target.value)} disabled={!sendDeclineMessage} className="min-h-[120px] text-sm" placeholder="Message to declined artists..." />
                </div>}
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
    </div>;
}