import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { ArrowLeft, CalendarIcon, Clock, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Opener {
  type: 'riff' | 'external';
  artist_id?: string;
  name: string;
}

interface GigData {
  id: string;
  gig_date: string;
  show_time: string | null;
  notes: string | null;
  openers: Opener[];
  venue_listing_id: string;
  artist_id: string;
  application_id: string | null;
  manual_venue_name: string | null;
  manual_location: string | null;
}

interface VenueListing {
  venue_name: string;
  room_name: string | null;
  location: string | null;
}

interface ArtistProfile {
  band_name: string | null;
  genre: string | null;
  pictures: string[] | null;
}

export default function ArtistGigDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gig, setGig] = useState<GigData | null>(null);
  const [venueListing, setVenueListing] = useState<VenueListing | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [artistName, setArtistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  const [editTime, setEditTime] = useState('');
  const [editVenueName, setEditVenueName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if this is a manual event (artist-created without application)
  const isManualEvent = gig && !gig.application_id;

  useEffect(() => {
    if (id && user) {
      fetchGig();
    }
  }, [id, user]);

  const fetchGig = async () => {
    setLoading(true);

    const { data: gigData, error } = await supabase
      .from('gig_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (!gigData || error) {
      setLoading(false);
      return;
    }

    setGig(gigData as unknown as GigData);

    // Fetch venue listing
    const { data: venueData } = await supabase
      .from('venue_listings')
      .select('venue_name, room_name, location')
      .eq('id', gigData.venue_listing_id)
      .single();

    if (venueData) {
      setVenueListing(venueData);
    }

    // Fetch artist profile (own profile)
    const { data: artistData } = await supabase
      .from('artist_profiles')
      .select('band_name, genre, pictures')
      .eq('user_id', gigData.artist_id)
      .single();

    if (artistData) {
      setArtistProfile(artistData);
    }

    // Fetch artist name from profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', gigData.artist_id)
      .single();

    if (profileData) {
      setArtistName(artistData?.band_name || `${profileData.first_name} ${profileData.last_name}`);
    }

    setLoading(false);
  };

  const handleEditClick = () => {
    if (!gig) return;
    setEditDate(new Date(gig.gig_date));
    setEditTime(gig.show_time || '');
    setEditVenueName(gig.manual_venue_name || '');
    setEditLocation(gig.manual_location || '');
    setEditNotes(gig.notes || '');
    setEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!gig || !editDate) return;

    if (isManualEvent && (!editVenueName.trim() || !editLocation.trim())) {
      toast.error('Venue name and location are required');
      return;
    }

    setSaving(true);

    const updateData: Record<string, unknown> = {
      gig_date: format(editDate, 'yyyy-MM-dd'),
      show_time: editTime || null,
      notes: editNotes.trim() || null,
    };

    // Only update manual fields for manual events
    if (isManualEvent) {
      updateData.manual_venue_name = editVenueName.trim();
      updateData.manual_location = editLocation.trim();
    }

    const { error } = await supabase
      .from('gig_listings')
      .update(updateData)
      .eq('id', gig.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      return;
    }

    toast.success('Changes saved!');
    setEditDialogOpen(false);
    navigate('/artist/calendar');
  };

  const handleCancelGig = async () => {
    if (!gig) return;
    
    setCancelling(true);

    // First get the application_id from the gig
    const { data: gigData } = await supabase
      .from('gig_listings')
      .select('application_id')
      .eq('id', gig.id)
      .single();

    if (gigData?.application_id) {
      // Revert application status to in_progress
      await supabase
        .from('applications')
        .update({ status: 'in_progress' })
        .eq('id', gigData.application_id);
    }

    // Delete the gig listing
    const { error } = await supabase
      .from('gig_listings')
      .delete()
      .eq('id', gig.id);

    setCancelling(false);

    if (error) {
      toast.error('Failed to cancel gig');
      return;
    }

    toast.success('Gig cancelled');
    navigate('/artist/calendar');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card animate-pulse" />
        <div className="h-96 bg-card animate-pulse" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">GIG NOT FOUND</h3>
        <Button onClick={() => navigate('/artist/calendar')} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const openers = (gig.openers || []) as Opener[];
  
  // Determine venue name and location to display
  const displayVenueName = isManualEvent && gig.manual_venue_name
    ? gig.manual_venue_name
    : venueListing?.room_name 
      ? `${venueListing.room_name} at ${venueListing.venue_name}`
      : venueListing?.venue_name || 'Venue';
  
  const displayLocation = isManualEvent && gig.manual_location
    ? gig.manual_location
    : venueListing?.location;

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate('/artist/calendar')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleEditClick}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </div>

      {/* Gig Flyer Style Card */}
      <div className="bg-card border-4 border-accent p-8 space-y-6">
        {/* Header Image */}
        {artistProfile?.pictures && artistProfile.pictures.length > 0 && (
          <div className="aspect-video bg-secondary overflow-hidden -mx-8 -mt-8 mb-6">
            <img 
              src={artistProfile.pictures[0]} 
              alt={artistName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Date & Time */}
        <div className="text-center">
          <p className="font-display text-sm text-primary tracking-widest">
            {format(new Date(gig.gig_date), 'EEEE').toUpperCase()}
          </p>
          <p className="font-display text-5xl md:text-6xl text-accent font-bold">
            {format(new Date(gig.gig_date), 'MMMM d').toUpperCase()}
          </p>
          <p className="font-display text-2xl text-muted-foreground">
            {format(new Date(gig.gig_date), 'yyyy')}
          </p>
          {gig.show_time && (
            <p className="font-display text-xl text-primary mt-2">
              {format(new Date(`2000-01-01T${gig.show_time}`), 'h:mm a')}
            </p>
          )}
        </div>

        {/* Headliner */}
        <div className="text-center border-t-2 border-border py-6">
          <p className="font-display text-xs text-primary tracking-widest mb-2">HEADLINER</p>
          <h1 className="font-display text-4xl md:text-5xl text-accent font-bold tracking-wide">
            {artistName.toUpperCase()}
          </h1>
        </div>

        {/* Openers Section */}
        {openers.length > 0 && (
          <div className="space-y-4">
            <p className="font-display text-xs text-primary tracking-widest text-center">WITH</p>
            <div className="space-y-2">
              {openers.map((opener, index) => (
                <div 
                  key={index} 
                  className="text-center bg-secondary px-4 py-3"
                >
                  <p className="font-display text-xl text-accent">{opener.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Venue Info */}
        <div className="text-center border-t-2 border-border pt-6">
          <p className="font-display text-2xl text-foreground">
            {displayVenueName}
          </p>
          {displayLocation && (
            <p className="text-muted-foreground mt-2">
              {displayLocation}
            </p>
          )}
        </div>

        {/* Notes */}
        {gig.notes && (
          <div className="bg-secondary p-4">
            <p className="font-display text-xs text-primary tracking-widest mb-2">NOTES</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{gig.notes}</p>
          </div>
        )}

        {/* Cancel Gig Button */}
        <Button 
          onClick={() => setCancelDialogOpen(true)} 
          variant="destructive"
          className="w-full"
        >
          Cancel Gig
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">EDIT GIG</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Date */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">DATE</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate ? format(editDate, 'MMMM do, yyyy') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={setEditDate}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">TIME OF SHOW</label>
              <div className="relative">
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="pl-10"
                />
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Manual event fields */}
            {isManualEvent && (
              <>
                {/* Venue Name */}
                <div className="space-y-2">
                  <label className="font-display text-xs text-primary tracking-widest">
                    VENUE NAME <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={editVenueName}
                    onChange={(e) => setEditVenueName(e.target.value)}
                    placeholder="Enter venue name"
                  />
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="font-display text-xs text-primary tracking-widest">
                    LOCATION <span className="text-destructive">*</span>
                  </label>
                  <LocationAutocomplete
                    value={editLocation}
                    onChange={setEditLocation}
                    placeholder="Search for location"
                  />
                </div>
              </>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="font-display text-xs text-primary tracking-widest">NOTES</label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add any notes..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveChanges}
              disabled={saving || !editDate || (isManualEvent && (!editVenueName.trim() || !editLocation.trim()))}
              className="bg-primary hover:bg-primary/90"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Gig?</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to cancel this gig? This will remove the event from both your calendar and the venue's calendar. Your application will be reverted to pending status.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep Gig
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelGig}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Gig'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}