import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, Plus, CheckCircle2, Trash2, PauseCircle } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
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
  const [creating, setCreating] = useState(false);
  const [deleteAllHoldsDialogOpen, setDeleteAllHoldsDialogOpen] = useState(false);
  const [deletingAllHolds, setDeletingAllHolds] = useState(false);
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

  const handleConfirmHold = async (gigId: string, gigDate: string, venueListingId: string, artistId: string) => {
    // Confirm this gig
    const { error: confirmError } = await supabase
      .from('gig_listings')
      .update({ is_confirmed: true, hold_priority: null })
      .eq('id', gigId);

    if (confirmError) {
      toast.error('Failed to confirm gig');
      return;
    }

    // Get all other holds for the same date and venue listing
    const { data: otherHolds } = await supabase
      .from('gig_listings')
      .select('id, application_id')
      .eq('venue_listing_id', venueListingId)
      .eq('gig_date', gigDate)
      .eq('is_confirmed', false)
      .neq('id', gigId);

    if (otherHolds && otherHolds.length > 0) {
      // Archive the applications for deleted holds
      const applicationIds = otherHolds.map(h => h.application_id).filter(Boolean);
      if (applicationIds.length > 0) {
        await supabase
          .from('applications')
          .update({ status: 'archived' })
          .in('id', applicationIds);
      }

      // Delete the other holds
      await supabase
        .from('gig_listings')
        .delete()
        .in('id', otherHolds.map(h => h.id));
    }

    // Send confirmation message to the artist
    const { data: artistProfile } = await supabase
      .from('artist_profiles')
      .select('band_name')
      .eq('user_id', artistId)
      .single();

    const { data: venueListing } = await supabase
      .from('venue_listings')
      .select('venue_name, room_name')
      .eq('id', venueListingId)
      .single();

    if (venueListing && user) {
      const roomName = venueListing.room_name || venueListing.venue_name;
      const artistName = artistProfile?.band_name || 'Artist';
      const formattedDate = format(new Date(gigDate), 'MMMM d, yyyy');
      
      await supabase.from('messages').insert({
        thread_id: crypto.randomUUID(),
        sender_id: user.id,
        receiver_id: artistId,
        subject: `Gig Confirmed: ${roomName} on ${formattedDate}`,
        content: `Great news! Your performance at ${roomName} on ${formattedDate} has been confirmed. This is no longer a hold - you're officially booked!\n\nWe're looking forward to having you perform.`,
        is_read: false,
        is_starred: false,
      });
    }

    toast.success('Gig confirmed! Other holds for this date have been archived.');
    fetchGigs();
  };

  const handleDeleteHold = async (gigId: string, applicationId: string | null) => {
    // Delete the gig listing
    const { error } = await supabase
      .from('gig_listings')
      .delete()
      .eq('id', gigId);

    if (error) {
      toast.error('Failed to delete hold');
      return;
    }

    // Archive the application
    if (applicationId) {
      await supabase
        .from('applications')
        .update({ status: 'archived' })
        .eq('id', applicationId);
    }

    toast.success('Hold deleted and application archived');
    fetchGigs();
  };

  const handleDeleteAllHolds = async () => {
    if (!selectedDate) return;
    
    setDeletingAllHolds(true);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Get all venue listing IDs for this user
    const { data: venueProfile } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('user_id', user!.id)
      .single();
    
    if (!venueProfile) {
      setDeletingAllHolds(false);
      return;
    }

    const { data: listings } = await supabase
      .from('venue_listings')
      .select('id')
      .eq('venue_profile_id', venueProfile.id);

    if (!listings) {
      setDeletingAllHolds(false);
      return;
    }

    const listingIds = listings.map(l => l.id);

    // Get all holds for this date
    const { data: holds } = await supabase
      .from('gig_listings')
      .select('id, application_id')
      .in('venue_listing_id', listingIds)
      .eq('gig_date', dateStr)
      .eq('is_confirmed', false);

    if (holds && holds.length > 0) {
      // Archive the applications
      const applicationIds = holds.map(h => h.application_id).filter(Boolean);
      if (applicationIds.length > 0) {
        await supabase
          .from('applications')
          .update({ status: 'archived' })
          .in('id', applicationIds);
      }

      // Delete the holds
      await supabase
        .from('gig_listings')
        .delete()
        .in('id', holds.map(h => h.id));
    }

    setDeletingAllHolds(false);
    setDeleteAllHoldsDialogOpen(false);
    toast.success('All holds for this date have been deleted');
    fetchGigs();
  };

  const gigDates = gigs.map(g => new Date(g.gig_date));
  const gigsOnSelectedDate = selectedDate ? gigs.filter(g => format(new Date(g.gig_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];
  const confirmedGigs = gigsOnSelectedDate.filter(g => g.is_confirmed);
  const holdGigs = gigsOnSelectedDate.filter(g => !g.is_confirmed).sort((a, b) => (a.hold_priority || 99) - (b.hold_priority || 99));
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
          
          {gigsOnSelectedDate.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events on this date</p>
          ) : (
            <div className="space-y-4">
              {/* Confirmed Shows */}
              {confirmedGigs.length > 0 && (
                <div className="space-y-2">
                  <p className="font-display text-xs text-green-500 tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    CONFIRMED
                  </p>
                  {confirmedGigs.map(gig => {
                    const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
                    const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
                    return (
                      <button 
                        key={gig.id} 
                        onClick={() => navigate(`/venue/calendar/${gig.id}`)} 
                        className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors"
                      >
                        <p className="font-display text-lg text-accent">{artistName}</p>
                        <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Holds */}
              {holdGigs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xs text-yellow-500 tracking-widest flex items-center gap-1">
                      <PauseCircle className="h-3 w-3" />
                      HOLDS
                    </p>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setDeleteAllHoldsDialogOpen(true)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete All Holds
                    </Button>
                  </div>
                  {holdGigs.map(gig => {
                    const artistName = gig.manual_artist_name || gig.artist_profile?.band_name || (gig.artist ? `${gig.artist.first_name} ${gig.artist.last_name}` : 'TBA');
                    const roomDisplay = gig.venue_listing?.room_name || gig.venue_listing?.venue_name;
                    return (
                      <div 
                        key={gig.id} 
                        className="bg-secondary p-4 flex items-center justify-between"
                      >
                        <button 
                          onClick={() => navigate(`/venue/calendar/${gig.id}`)}
                          className="text-left flex-1 hover:opacity-80 transition-opacity"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 font-display">
                              #{gig.hold_priority}
                            </span>
                            <p className="font-display text-lg text-accent">{artistName}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                        </button>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHold(gig.id, gig.application_id);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmHold(gig.id, gig.gig_date, gig.venue_listing_id, gig.artist_id);
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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

      {/* Delete All Holds Confirmation Dialog */}
      <Dialog open={deleteAllHoldsDialogOpen} onOpenChange={setDeleteAllHoldsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">DELETE ALL HOLDS</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-muted-foreground">
              Are you sure you want to delete all holds for {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'this date'}? 
              The associated applications will be moved to archived.
            </p>
          </div>

          <DialogFooter className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteAllHoldsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteAllHolds} 
              disabled={deletingAllHolds}
              variant="destructive"
            >
              {deletingAllHolds ? 'Deleting...' : 'Delete All Holds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}