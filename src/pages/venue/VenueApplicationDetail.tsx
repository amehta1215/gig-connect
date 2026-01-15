import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ArrowLeft, Calendar, Clock, CheckCircle2, Archive, ExternalLink, MessageSquare, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ArtistProfile {
  band_name: string | null;
  genre: string | null;
  bio: string | null;
  location: string | null;
  spotify_link: string | null;
  soundcloud_link: string | null;
  apple_music_link: string | null;
  youtube_link: string | null;
  facebook_link: string | null;
  tiktok_link: string | null;
  pictures: string[] | null;
  featured_samples: string[] | null;
  past_gigs: string[] | null;
  press_links: string[] | null;
}

interface ApplicationData {
  id: string;
  artist_id: string;
  status: 'in_progress' | 'accepted' | 'archived';
  created_at: string;
  message: string | null;
  availability_preference: 'date_range' | 'specific_dates' | 'flexible' | null;
  availability_start_date: string | null;
  availability_end_date: string | null;
  availability_specific_dates: string[] | null;
  payment_preference: string | null;
  lineup_preference: string | null;
  venue_listing_id: string;
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

const statusConfig = {
  in_progress: {
    icon: Clock,
    label: 'PENDING',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  accepted: {
    icon: CheckCircle2,
    label: 'ACCEPTED',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  archived: {
    icon: Archive,
    label: 'ARCHIVED',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const paymentLabels: Record<string, string> = {
  door_split: 'Door Split',
  bar_split: 'Bar Split',
  tip_based: 'Tip Based',
  flat_fee: 'Flat Fee',
  rental: 'Rental',
};

const lineupLabels: Record<string, string> = {
  co_acts_needed: 'Co-acts Needed',
  co_acts_confirmed: 'Co-acts Confirmed',
  solo_performer: 'Solo Performer',
};

const availabilityLabels: Record<string, string> = {
  date_range: 'Date Range',
  specific_dates: 'Specific Dates',
  flexible: 'Flexible',
};

export default function VenueApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [venueListing, setVenueListing] = useState<VenueListing | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Message dialog state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageContent, setMessageContent] = useState('');
  
  // Accept dialog state
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedGigDate, setSelectedGigDate] = useState<Date | undefined>(undefined);
  const [selectedGigTime, setSelectedGigTime] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchApplication();
    }
  }, [id, user]);

  const fetchApplication = async () => {
    setLoading(true);
    
    // First fetch the application with artist info
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        artist:profiles!applications_artist_id_fkey(first_name, last_name)
      `)
      .eq('id', id)
      .maybeSingle();

    if (!data || error) {
      setLoading(false);
      return;
    }

    setApplication(data as unknown as ApplicationData);

    // Fetch venue listing info
    const { data: listingData } = await supabase
      .from('venue_listings')
      .select('id, venue_name, room_name')
      .eq('id', data.venue_listing_id)
      .single();

    if (listingData) {
      setVenueListing(listingData);
    }

    // Fetch artist profile
    const { data: profileData } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', data.artist_id)
      .single();

    if (profileData) {
      setArtistProfile(profileData as ArtistProfile);
    }

    // Mark as read
    await supabase
      .from('applications')
      .update({ is_read: true })
      .eq('id', id);

    setLoading(false);
  };

  const updateStatus = async (newStatus: 'accepted' | 'archived' | 'in_progress') => {
    if (!application) return;
    
    // If rescinding acceptance, delete the associated gig listing first
    if (application.status === 'accepted' && newStatus === 'in_progress') {
      const { error: deleteError } = await supabase
        .from('gig_listings')
        .delete()
        .eq('application_id', application.id);
      
      if (deleteError) {
        toast.error('Failed to remove gig listing');
        return;
      }
      toast.success('Acceptance rescinded and gig removed from calendar');
    }
    
    await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', application.id);
    
    // Stay on page for rescind/unarchive, navigate back for accept/archive
    if (newStatus === 'in_progress') {
      setApplication({ ...application, status: newStatus });
    } else {
      navigate('/venue');
    }
  };

  const handleAcceptClick = () => {
    // Pre-select a date from application if available
    if (application?.availability_start_date) {
      setSelectedGigDate(new Date(application.availability_start_date));
    } else if (application?.availability_specific_dates && application.availability_specific_dates.length > 0) {
      setSelectedGigDate(new Date(application.availability_specific_dates[0]));
    }
    setAcceptDialogOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!application || !selectedGigDate) {
      toast.error('Please select a gig date');
      return;
    }

    // Create gig listing
    const { error: gigError } = await supabase
      .from('gig_listings')
      .insert({
        application_id: application.id,
        venue_listing_id: application.venue_listing_id,
        artist_id: application.artist_id,
        gig_date: format(selectedGigDate, 'yyyy-MM-dd'),
        show_time: selectedGigTime || null,
        openers: [],
        notes: null,
      });

    if (gigError) {
      toast.error('Failed to create gig listing');
      return;
    }

    // Update application status
    await supabase
      .from('applications')
      .update({ status: 'accepted' })
      .eq('id', application.id);

    toast.success('Application accepted! Gig created.');
    setAcceptDialogOpen(false);
    navigate('/venue');
  };

  const handleMessageClick = async () => {
    if (!user || !application) return;

    // Check if a thread already exists between the venue and artist
    const { data: existingMessages } = await supabase
      .from('messages')
      .select('thread_id')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${application.artist_id}),and(sender_id.eq.${application.artist_id},receiver_id.eq.${user.id})`)
      .limit(1);

    if (existingMessages && existingMessages.length > 0) {
      // Thread exists, navigate to messages with the thread selected
      navigate(`/venue/messages?thread=${existingMessages[0].thread_id}`);
      return;
    }

    // No existing thread, open the message dialog
    const roomName = venueListing?.room_name || '';
    const venueName = venueListing?.venue_name || '';
    const subject = roomName 
      ? `Application for ${roomName} at ${venueName}`
      : `Application for ${venueName}`;
    setMessageSubject(subject);
    setMessageDialogOpen(true);
  };

  const handleSendMessage = async () => {
    if (!user || !application || !messageContent.trim()) return;
    
    setSendingMessage(true);
    
    // Create a thread_id based on the application
    const threadId = crypto.randomUUID();
    
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: application.artist_id,
      thread_id: threadId,
      subject: messageSubject.trim() || `Re: Application for ${venueListing?.venue_name || 'venue'}`,
      content: messageContent.trim(),
      is_read: false,
      is_starred: false,
    });

    setSendingMessage(false);

    if (error) {
      toast.error('Failed to send message');
      return;
    }

    toast.success('Message sent!');
    setMessageDialogOpen(false);
    setMessageSubject('');
    setMessageContent('');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card animate-pulse" />
        <div className="h-64 bg-card animate-pulse" />
        <div className="h-32 bg-card animate-pulse" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">APPLICATION NOT FOUND</h3>
        <Button onClick={() => navigate('/venue')} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;
  const bandName = artistProfile?.band_name || `${application.artist?.first_name} ${application.artist?.last_name}`;

  const socialLinks = [
    { key: 'spotify_link', label: 'Spotify', value: artistProfile?.spotify_link },
    { key: 'soundcloud_link', label: 'SoundCloud', value: artistProfile?.soundcloud_link },
    { key: 'apple_music_link', label: 'Apple Music', value: artistProfile?.apple_music_link },
    { key: 'youtube_link', label: 'YouTube', value: artistProfile?.youtube_link },
    { key: 'facebook_link', label: 'Facebook', value: artistProfile?.facebook_link },
    { key: 'tiktok_link', label: 'TikTok', value: artistProfile?.tiktok_link },
  ].filter(link => link.value);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" size="icon" onClick={() => navigate('/venue')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Status Banner */}
      <div className={`flex items-center justify-between gap-2 px-4 py-2 ${config.bgColor} ${config.color}`}>
        <div className="flex items-center gap-2 font-display tracking-widest text-sm">
          <StatusIcon className="h-4 w-4" />
          {config.label}
          <span className="text-muted-foreground ml-2">
            Submitted {format(new Date(application.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleMessageClick} className="bg-primary hover:bg-primary/90">
            <MessageSquare className="h-4 w-4 mr-1" />
            Message
          </Button>
          {application.status === 'in_progress' && (
            <>
              <Button size="sm" onClick={handleAcceptClick} className="bg-primary hover:bg-primary/90">
                Accept
              </Button>
              <Button size="sm" onClick={() => updateStatus('archived')} className="bg-primary hover:bg-primary/90">
                Archive
              </Button>
            </>
          )}
          {application.status === 'accepted' && (
            <Button size="sm" onClick={() => updateStatus('in_progress')} variant="outline">
              Rescind Acceptance
            </Button>
          )}
          {application.status === 'archived' && (
            <Button size="sm" onClick={() => updateStatus('in_progress')} variant="outline">
              Unarchive
            </Button>
          )}
        </div>
      </div>

      {/* Artist Header */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-accent font-bold tracking-wide">
            {bandName}
          </h1>
          {venueListing && (
            <p className="text-lg text-muted-foreground mt-1">
              Applied to: {venueListing.venue_name}{venueListing.room_name ? ` — ${venueListing.room_name}` : ''}
            </p>
          )}
        </div>

      </div>

      {/* Main Artist Picture */}
      {artistProfile?.pictures && artistProfile.pictures.length > 0 && (
        <div className="flex justify-center">
          <img src={artistProfile.pictures[0]} alt={`${bandName} main photo`} className="max-h-64 w-auto object-contain" />
        </div>
      )}

      {/* Artist Bio */}
      {artistProfile?.bio && (
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">BIO</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{artistProfile.bio}</p>
        </div>
      )}

      {/* Social Links */}
      {socialLinks.length > 0 && (
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">LINKS</h2>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map((link) => (
              <a
                key={link.key}
                href={link.value!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm bg-secondary px-3 py-1.5 hover:bg-secondary/80 transition-colors"
              >
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Featured Samples */}
      {artistProfile?.featured_samples && artistProfile.featured_samples.length > 0 && (
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">FEATURED SAMPLES</h2>
          <div className="space-y-2">
            {artistProfile.featured_samples.map((sample, i) => (
              <audio key={i} controls className="w-full">
                <source src={sample} />
              </audio>
            ))}
          </div>
        </div>
      )}

      {/* Past Gigs */}
      {artistProfile?.past_gigs && artistProfile.past_gigs.length > 0 && (
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">PAST GIGS</h2>
          <ul className="space-y-1">
            {artistProfile.past_gigs.map((gig, i) => (
              <li key={i} className="text-muted-foreground text-sm">{gig}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Press Links */}
      {artistProfile?.press_links && artistProfile.press_links.length > 0 && (
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">PRESS</h2>
          <ul className="space-y-1">
            {artistProfile.press_links.map((link, i) => (
              <li key={i}>
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  {link}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Application Details */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl text-accent font-bold">APPLICATION DETAILS</h2>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {/* Genre */}
          {artistProfile?.genre && (
            <div className="space-y-1">
              <h3 className="font-display text-xs text-primary tracking-widest">GENRE</h3>
              <p className="text-foreground">{artistProfile.genre}</p>
            </div>
          )}

          {/* Based In */}
          {artistProfile?.location && (
            <div className="space-y-1">
              <h3 className="font-display text-xs text-primary tracking-widest">BASED IN</h3>
              <p className="text-foreground">{artistProfile.location}</p>
            </div>
          )}
          {/* Availability */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">AVAILABILITY</h3>
            <p className="text-foreground">
              {application.availability_preference 
                ? availabilityLabels[application.availability_preference] 
                : 'Not specified'}
            </p>
            {application.availability_preference === 'date_range' && application.availability_start_date && application.availability_end_date && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(application.availability_start_date), 'MMM d, yyyy')} - {format(new Date(application.availability_end_date), 'MMM d, yyyy')}
              </p>
            )}
            {application.availability_preference === 'specific_dates' && application.availability_specific_dates && application.availability_specific_dates.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {application.availability_specific_dates.map((date, i) => (
                  <span key={i} className="text-xs bg-secondary px-2 py-0.5">
                    {format(new Date(date), 'MMM d, yyyy')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">PAYMENT PREFERENCE</h3>
            <p className="text-foreground">
              {application.payment_preference 
                ? paymentLabels[application.payment_preference] 
                : 'Not specified'}
            </p>
          </div>

          {/* Lineup */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">LINEUP</h3>
            <p className="text-foreground">
              {application.lineup_preference 
                ? lineupLabels[application.lineup_preference] 
                : 'Not specified'}
            </p>
          </div>
        </div>

        {application.message && (
          <div className="space-y-1 pt-2 border-t border-border">
            <h3 className="font-display text-xs text-primary tracking-widest">MESSAGE</h3>
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{application.message}</p>
          </div>
        )}
      </div>

      {/* Additional Photos */}
      {artistProfile?.pictures && artistProfile.pictures.length > 1 && (
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">ADDITIONAL PHOTOS</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {artistProfile.pictures.slice(1).map((pic, i) => (
              <div key={i} className="aspect-square bg-secondary overflow-hidden">
                <img src={pic} alt={`${bandName} photo ${i + 2}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide">
              MESSAGE {bandName.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="font-display text-xs text-muted-foreground tracking-widest block mb-2">
                SUBJECT
              </label>
              <Input
                value={messageSubject}
                onChange={(e) => setMessageSubject(e.target.value)}
                placeholder={`Re: Application for ${venueListing?.venue_name || 'venue'}`}
                className="bg-background border-border"
              />
            </div>
            <div>
              <label className="font-display text-xs text-muted-foreground tracking-widest block mb-2">
                MESSAGE
              </label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Write your message..."
                className="bg-background border-border min-h-[150px]"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSendMessage} 
                disabled={!messageContent.trim() || sendingMessage}
                className="bg-primary hover:bg-primary/90"
              >
                {sendingMessage ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accept Dialog with Date and Time Picker */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide">
              SELECT GIG DATE & TIME
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-muted-foreground text-sm">
              Choose the date and time for {bandName}'s performance
            </p>
            
            <div className="space-y-2">
              <label className="font-display text-xs text-muted-foreground tracking-widest block">
                DATE
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedGigDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedGigDate ? format(selectedGigDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedGigDate}
                    onSelect={setSelectedGigDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="font-display text-xs text-muted-foreground tracking-widest block">
                TIME OF SHOW
              </label>
              <Input
                type="time"
                value={selectedGigTime}
                onChange={(e) => setSelectedGigTime(e.target.value)}
                className="bg-background border-border"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmAccept} 
                disabled={!selectedGigDate}
                className="bg-primary hover:bg-primary/90"
              >
                Accept & Create Gig
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
