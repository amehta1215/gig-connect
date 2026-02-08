import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, Clock, CheckCircle2, Archive, ExternalLink, MessageSquare, CalendarIcon, PauseCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
import HoldsOrderList from '@/components/HoldsOrderList';
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
    bgColor: 'bg-yellow-500/10'
  },
  accepted: {
    icon: CheckCircle2,
    label: 'ACCEPTED',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
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
export default function VenueApplicationDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [venueListing, setVenueListing] = useState<VenueListing | null>(null);
  const [loading, setLoading] = useState(true);

  // Accept dialog state
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedGigDate, setSelectedGigDate] = useState<Date | undefined>(undefined);
  const [selectedGigTime, setSelectedGigTime] = useState('');
  const [acceptType, setAcceptType] = useState<'confirmed' | 'hold'>('confirmed');
  const [holdPriority, setHoldPriority] = useState(1);
  const [existingHolds, setExistingHolds] = useState<{
    id: string;
    artist_name: string;
    hold_priority: number;
  }[]>([]);
  const [dateMode, setDateMode] = useState<'single' | 'range' | 'specific'>('single');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedSpecificDates, setSelectedSpecificDates] = useState<Date[]>([]);
  const [sendAcceptMessage, setSendAcceptMessage] = useState(true);
  const [acceptMessage, setAcceptMessage] = useState('');
  useEffect(() => {
    if (id && user) {
      fetchApplication();
    }
  }, [id, user]);
  const fetchApplication = async () => {
    setLoading(true);

    // First fetch the application with artist info
    const {
      data,
      error
    } = await supabase.from('applications').select(`
        *,
        artist:profiles!applications_artist_id_fkey(first_name, last_name)
      `).eq('id', id).maybeSingle();
    if (!data || error) {
      setLoading(false);
      return;
    }
    setApplication(data as unknown as ApplicationData);

    // Fetch venue listing info
    const {
      data: listingData
    } = await supabase.from('venue_listings').select('id, venue_name, room_name').eq('id', data.venue_listing_id).single();
    if (listingData) {
      setVenueListing(listingData);
    }

    // Fetch artist profile
    const {
      data: profileData
    } = await supabase.from('artist_profiles').select('*').eq('user_id', data.artist_id).single();
    if (profileData) {
      setArtistProfile(profileData as ArtistProfile);
    }

    // Mark as read
    await supabase.from('applications').update({
      is_read: true
    }).eq('id', id);
    setLoading(false);
  };
  const updateStatus = async (newStatus: 'accepted' | 'archived' | 'in_progress') => {
    if (!application) return;

    // If rescinding acceptance, delete the associated gig listing first
    if (application.status === 'accepted' && newStatus === 'in_progress') {
      const {
        error: deleteError
      } = await supabase.from('gig_listings').delete().eq('application_id', application.id);
      if (deleteError) {
        toast.error('Failed to remove gig listing');
        return;
      }
      toast.success('Acceptance rescinded and gig removed from calendar');
    }
    await supabase.from('applications').update({
      status: newStatus
    }).eq('id', application.id);

    // Stay on page for rescind/unarchive, navigate back for accept/archive
    if (newStatus === 'in_progress') {
      setApplication({
        ...application,
        status: newStatus
      });
    } else {
      navigate('/venue');
    }
  };
  const fetchExistingHolds = useCallback(async (date: Date) => {
    if (!application?.venue_listing_id) return;
    const dateStr = format(date, 'yyyy-MM-dd');
    const {
      data: holds
    } = await supabase.from('gig_listings').select('id, artist_id, manual_artist_name, hold_priority').eq('venue_listing_id', application.venue_listing_id).eq('gig_date', dateStr).eq('is_confirmed', false).order('hold_priority', {
      ascending: true
    });
    if (holds && holds.length > 0) {
      // Fetch artist names for each hold
      const holdsWithNames = await Promise.all(holds.map(async hold => {
        if (hold.manual_artist_name) {
          return {
            id: hold.id,
            artist_name: hold.manual_artist_name,
            hold_priority: hold.hold_priority || 99
          };
        }
        const {
          data: artistProfile
        } = await supabase.from('artist_profiles').select('band_name').eq('user_id', hold.artist_id).maybeSingle();
        if (artistProfile?.band_name) {
          return {
            id: hold.id,
            artist_name: artistProfile.band_name,
            hold_priority: hold.hold_priority || 99
          };
        }
        const {
          data: profile
        } = await supabase.from('profiles').select('first_name, last_name').eq('id', hold.artist_id).maybeSingle();
        const name = profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown Artist';
        return {
          id: hold.id,
          artist_name: name,
          hold_priority: hold.hold_priority || 99
        };
      }));
      setExistingHolds(holdsWithNames);
      setHoldPriority(holdsWithNames.length + 1);
    } else {
      setExistingHolds([]);
      setHoldPriority(1);
    }
  }, [application?.venue_listing_id]);
  const handleAcceptClick = () => {
    // Pre-select date mode and dates from application availability
    let initialDate: Date | undefined;
    setSelectedGigTime('');
    setExistingHolds([]);
    setHoldPriority(1);
    setSelectedDateRange(undefined);
    setSelectedSpecificDates([]);

    if (application?.availability_preference === 'date_range' && application.availability_start_date && application.availability_end_date) {
      setDateMode('range');
      setSelectedDateRange({
        from: new Date(application.availability_start_date),
        to: new Date(application.availability_end_date)
      });
      setAcceptType('hold');
    } else if (application?.availability_preference === 'specific_dates' && application.availability_specific_dates && application.availability_specific_dates.length > 0) {
      setDateMode('specific');
      setSelectedSpecificDates(application.availability_specific_dates.map(d => new Date(d)));
      setAcceptType('hold');
    } else {
      setDateMode('single');
      if (application?.availability_start_date) {
        initialDate = new Date(application.availability_start_date);
      } else if (application?.availability_specific_dates && application.availability_specific_dates.length > 0) {
        initialDate = new Date(application.availability_specific_dates[0]);
      }
      setAcceptType('confirmed');
    }

    setSelectedGigDate(initialDate);
    if (initialDate) {
      fetchExistingHolds(initialDate);
    }

    // Set default accept message based on date mode
    const roomName = venueListing?.room_name || venueListing?.venue_name || 'our venue';
    setSendAcceptMessage(true);

    if (application?.availability_preference === 'date_range' && application.availability_start_date && application.availability_end_date) {
      const startFormatted = format(new Date(application.availability_start_date), 'MMM d, yyyy');
      const endFormatted = format(new Date(application.availability_end_date), 'MMM d, yyyy');
      setAcceptMessage(`We're pleased to let you know that you have been put on hold for ${roomName} for the following dates: ${startFormatted} - ${endFormatted}.\n\nWe'll be in touch with more details soon.`);
    } else if (application?.availability_preference === 'specific_dates' && application.availability_specific_dates && application.availability_specific_dates.length > 0) {
      const datesFormatted = application.availability_specific_dates.map(d => format(new Date(d), 'MMM d, yyyy')).join(', ');
      setAcceptMessage(`We're pleased to let you know that you have been put on hold for ${roomName} for the following dates: ${datesFormatted}.\n\nWe'll be in touch with more details soon.`);
    } else {
      setAcceptMessage(`We're pleased to let you know that your application for ${roomName} has been accepted!\n\nWe'll be in touch with more details soon.`);
    }

    setAcceptDialogOpen(true);
  };
  const handleDateChange = (date: Date | undefined) => {
    setSelectedGigDate(date);
    if (date) {
      fetchExistingHolds(date);
    } else {
      setExistingHolds([]);
      setHoldPriority(1);
    }
  };
  const handleConfirmAccept = async () => {
    if (!application || !user) return;

    let dates: Date[] = [];

    if (dateMode === 'single') {
      if (!selectedGigDate) {
        toast.error('Please select a gig date');
        return;
      }
      dates = [selectedGigDate];
    } else if (dateMode === 'range') {
      if (!selectedDateRange?.from || !selectedDateRange?.to) {
        toast.error('Please select a date range');
        return;
      }
      const current = new Date(selectedDateRange.from);
      const end = new Date(selectedDateRange.to);
      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else {
      if (selectedSpecificDates.length === 0) {
        toast.error('Please select at least one date');
        return;
      }
      dates = [...selectedSpecificDates];
    }

    const isHold = dateMode !== 'single' || acceptType === 'hold';

    // For single date with hold, handle priority shifting
    if (dateMode === 'single' && isHold && existingHolds.length > 0) {
      for (const hold of existingHolds) {
        if (hold.hold_priority >= holdPriority) {
          await supabase.from('gig_listings').update({
            hold_priority: hold.hold_priority + 1
          }).eq('id', hold.id);
        }
      }
    }

    // Create gig listings for each date
    for (const date of dates) {
      const dateStr = format(date, 'yyyy-MM-dd');

      let priority: number | null = null;
      if (isHold) {
        if (dateMode === 'single') {
          priority = holdPriority;
        } else {
          // For range/specific dates, auto-assign priority at end
          const { data: existingDateHolds } = await supabase
            .from('gig_listings')
            .select('hold_priority')
            .eq('venue_listing_id', application.venue_listing_id)
            .eq('gig_date', dateStr)
            .eq('is_confirmed', false)
            .order('hold_priority', { ascending: false })
            .limit(1);
          priority = (existingDateHolds?.[0]?.hold_priority || 0) + 1;
        }
      }

      const { error: gigError } = await supabase.from('gig_listings').insert({
        application_id: application.id,
        venue_listing_id: application.venue_listing_id,
        artist_id: application.artist_id,
        gig_date: dateStr,
        show_time: dateMode === 'single' && selectedGigTime ? selectedGigTime : null,
        openers: [],
        notes: null,
        is_confirmed: !isHold,
        hold_priority: isHold ? priority : null
      });
      if (gigError) {
        toast.error('Failed to create gig listing');
        return;
      }
    }

    // Update application status
    await supabase.from('applications').update({
      status: 'accepted'
    }).eq('id', application.id);

    // Build date text for the message
    let dateText = '';
    if (dateMode === 'single') {
      dateText = format(dates[0], 'MMM d, yyyy');
    } else if (dateMode === 'range' && selectedDateRange?.from && selectedDateRange?.to) {
      dateText = `${format(selectedDateRange.from, 'MMM d, yyyy')} - ${format(selectedDateRange.to, 'MMM d, yyyy')}`;
    } else {
      dateText = dates.map(d => format(d, 'MMM d, yyyy')).join(', ');
    }

    // Send message if enabled
    if (sendAcceptMessage && acceptMessage.trim()) {
      // If message still matches default template, update with date info
      const roomName = venueListing?.room_name || venueListing?.venue_name || 'our venue';
      let messageToSend = acceptMessage;
      const defaultMsg = `We're pleased to let you know that your application for ${roomName} has been accepted!\n\nWe'll be in touch with more details soon.`;
      if (acceptMessage.trim() === defaultMsg.trim() && isHold) {
        messageToSend = `We're pleased to let you know that you have been put on hold for ${roomName} for the following dates: ${dateText}.\n\nWe'll be in touch with more details soon.`;
      }

      await supabase.from('messages').insert({
        thread_id: crypto.randomUUID(),
        sender_id: user.id,
        receiver_id: application.artist_id,
        subject: `Application Update: ${venueListing?.room_name || venueListing?.venue_name || 'Venue'}`,
        content: messageToSend,
        is_read: false,
        is_starred: false
      });
    }

    const toastDateText = dates.length === 1
      ? format(dates[0], 'MMM d, yyyy')
      : `${dates.length} dates`;
    toast.success(isHold ? `Application accepted as hold for ${toastDateText}!` : 'Application accepted! Gig confirmed.');
    setAcceptDialogOpen(false);
    navigate('/venue');
  };
  const handleMessageClick = async () => {
    if (!user || !application) return;

    // Check if a thread already exists between the venue and artist
    const {
      data: existingMessages
    } = await supabase.from('messages').select('thread_id').or(`and(sender_id.eq.${user.id},receiver_id.eq.${application.artist_id}),and(sender_id.eq.${application.artist_id},receiver_id.eq.${user.id})`).limit(1);
    if (existingMessages && existingMessages.length > 0) {
      // Thread exists, navigate to messages with the thread selected
      navigate(`/venue/messages?thread=${existingMessages[0].thread_id}`);
      return;
    }

    // No existing thread, navigate to messages with compose panel open
    const roomName = venueListing?.room_name || venueListing?.venue_name || '';
    const artistName = `${application.artist?.first_name || ''} ${application.artist?.last_name || ''}`.trim();
    const bandName = artistProfile?.band_name || '';
    const displayName = bandName || artistName;
    const subject = `Application for ${roomName} - ${displayName}`;
    const params = new URLSearchParams({
      compose: 'true',
      artistId: application.artist_id,
      artistName: artistName,
      ...(bandName && {
        bandName
      }),
      subject: subject
    });
    navigate(`/venue/messages?${params.toString()}`);
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card animate-pulse" />
        <div className="h-64 bg-card animate-pulse" />
        <div className="h-32 bg-card animate-pulse" />
      </div>;
  }
  if (!application) {
    return <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">APPLICATION NOT FOUND</h3>
        <Button onClick={() => navigate('/venue')} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>;
  }
  const config = statusConfig[application.status];
  const StatusIcon = config.icon;
  const bandName = artistProfile?.band_name || `${application.artist?.first_name} ${application.artist?.last_name}`;
  const socialLinks = [{
    key: 'spotify_link',
    label: 'Spotify',
    value: artistProfile?.spotify_link
  }, {
    key: 'soundcloud_link',
    label: 'SoundCloud',
    value: artistProfile?.soundcloud_link
  }, {
    key: 'apple_music_link',
    label: 'Apple Music',
    value: artistProfile?.apple_music_link
  }, {
    key: 'youtube_link',
    label: 'YouTube',
    value: artistProfile?.youtube_link
  }, {
    key: 'facebook_link',
    label: 'Facebook',
    value: artistProfile?.facebook_link
  }, {
    key: 'tiktok_link',
    label: 'TikTok',
    value: artistProfile?.tiktok_link
  }].filter(link => link.value);
  return <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
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
          {application.status === 'in_progress' && <>
              <Button size="sm" onClick={handleAcceptClick} className="bg-primary hover:bg-primary/90">
                Accept
              </Button>
              <Button size="sm" onClick={() => updateStatus('archived')} className="bg-primary hover:bg-primary/90">
                Archive
              </Button>
            </>}
          {application.status === 'accepted' && <Button size="sm" onClick={() => updateStatus('in_progress')} variant="outline">
              Rescind Acceptance
            </Button>}
          {application.status === 'archived' && <Button size="sm" onClick={() => updateStatus('in_progress')} variant="outline">
              Unarchive
            </Button>}
        </div>
      </div>

      {/* Artist Header */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-wide text-primary font-semibold">
            {bandName}
          </h1>
        {venueListing && <p className="text-lg mt-1 text-primary">
              Applied to: {venueListing.room_name || venueListing.venue_name}
            </p>}
        </div>

      </div>

      {/* Main Artist Picture */}
      {artistProfile?.pictures && artistProfile.pictures.length > 0 && <div className="flex justify-center">
          <img src={artistProfile.pictures[0]} alt={`${bandName} main photo`} className="max-h-64 w-auto object-contain" />
        </div>}

      {/* Application Details */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="font-display text-2xl text-accent font-bold">APPLICATION DETAILS</h2>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          {/* Genre */}
          {artistProfile?.genre && <div className="space-y-1">
              <h3 className="font-display text-xs text-primary tracking-widest">GENRE</h3>
              <p className="text-foreground">{artistProfile.genre}</p>
            </div>}

          {/* Based In */}
          {artistProfile?.location && <div className="space-y-1">
              <h3 className="font-display text-xs text-primary tracking-widest">BASED IN</h3>
              <p className="text-foreground">{artistProfile.location}</p>
            </div>}
          {/* Availability */}
          <div className="space-y-1">
            <h3 className="font-display text-xs text-primary tracking-widest">AVAILABILITY</h3>
            <p className="text-foreground">
              {application.availability_preference ? availabilityLabels[application.availability_preference] : 'Not specified'}
            </p>
            {application.availability_preference === 'date_range' && application.availability_start_date && application.availability_end_date && <p className="text-sm flex items-center gap-1 text-primary">
                <Calendar className="h-3 w-3" />
                {format(new Date(application.availability_start_date), 'MMM d, yyyy')} - {format(new Date(application.availability_end_date), 'MMM d, yyyy')}
              </p>}
            {application.availability_preference === 'specific_dates' && application.availability_specific_dates && application.availability_specific_dates.length > 0 && <div className="flex flex-wrap gap-1 mt-1">
                {application.availability_specific_dates.map((date, i) => <span key={i} className="text-xs bg-secondary px-2 py-0.5">
                    {format(new Date(date), 'MMM d, yyyy')}
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
            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{application.message}</p>
          </div>}
      </div>

      {/* Artist Bio */}
      {artistProfile?.bio && <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">BIO</h2>
          <p className="whitespace-pre-wrap text-primary">{artistProfile.bio}</p>
        </div>}

      {/* Social Links */}
      {socialLinks.length > 0 && <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">LINKS</h2>
          <div className="flex flex-wrap gap-2">
            {socialLinks.map(link => <a key={link.key} href={link.value!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm bg-secondary px-3 py-1.5 hover:bg-secondary/80 transition-colors">
                {link.label}
                <ExternalLink className="h-3 w-3" />
              </a>)}
          </div>
        </div>}

      {/* Featured Samples */}
      {artistProfile?.featured_samples && artistProfile.featured_samples.length > 0 && <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">FEATURED SAMPLES</h2>
          <div className="space-y-2">
            {artistProfile.featured_samples.map((sample, i) => <audio key={i} controls className="w-full">
                <source src={sample} />
              </audio>)}
          </div>
        </div>}

      {/* Past Gigs */}
      {artistProfile?.past_gigs && artistProfile.past_gigs.length > 0 && <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">PAST GIGS</h2>
          <ul className="space-y-1">
            {artistProfile.past_gigs.map((gig, i) => <li key={i} className="text-sm text-primary">{gig}</li>)}
          </ul>
        </div>}

      {/* Press Links */}
      {artistProfile?.press_links && artistProfile.press_links.length > 0 && <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">PRESS</h2>
          <ul className="space-y-1">
            {artistProfile.press_links.map((link, i) => <li key={i}>
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
                  {link}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>)}
          </ul>
        </div>}

      {/* Additional Photos */}
      {artistProfile?.pictures && artistProfile.pictures.length > 1 && <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-3">ADDITIONAL PHOTOS</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {artistProfile.pictures.slice(1).map((pic, i) => <div key={i} className="aspect-square bg-secondary overflow-hidden">
                <img src={pic} alt={`${bandName} photo ${i + 2}`} className="w-full h-full object-cover" />
              </div>)}
          </div>
        </div>}

      {/* Accept Dialog with Date and Time Picker */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide">
              ADD GIG DETAILS FOR {bandName?.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">

            {/* Date Selection Mode */}
            <div className="space-y-2">
              <label className="font-display text-xs text-muted-foreground tracking-widest block">DATE SELECTION</label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={dateMode === 'single' ? 'default' : 'outline'} onClick={() => setDateMode('single')}>
                  Single Date
                </Button>
                <Button type="button" size="sm" variant={dateMode === 'range' ? 'default' : 'outline'} onClick={() => setDateMode('range')}>
                  Date Range
                </Button>
                <Button type="button" size="sm" variant={dateMode === 'specific' ? 'default' : 'outline'} onClick={() => setDateMode('specific')}>
                  Specific Dates
                </Button>
              </div>
            </div>

            {/* Single Date Picker */}
            {dateMode === 'single' && (
              <div className="space-y-2">
                <label className="font-display text-xs text-muted-foreground tracking-widest block">DATE</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedGigDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedGigDate ? format(selectedGigDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="single" selected={selectedGigDate} onSelect={handleDateChange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Date Range Picker */}
            {dateMode === 'range' && (
              <div className="space-y-2">
                <label className="font-display text-xs text-muted-foreground tracking-widest block">DATE RANGE</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDateRange?.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDateRange?.from ? (
                        selectedDateRange.to
                          ? `${format(selectedDateRange.from, "MMM d")} - ${format(selectedDateRange.to, "MMM d, yyyy")}`
                          : format(selectedDateRange.from, "PPP")
                      ) : "Pick a date range"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="range" selected={selectedDateRange} onSelect={setSelectedDateRange} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Specific Dates Picker */}
            {dateMode === 'specific' && (
              <div className="space-y-2">
                <label className="font-display text-xs text-muted-foreground tracking-widest block">SPECIFIC DATES</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", selectedSpecificDates.length === 0 && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedSpecificDates.length > 0
                        ? `${selectedSpecificDates.length} date${selectedSpecificDates.length !== 1 ? 's' : ''} selected`
                        : "Pick dates"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent mode="multiple" selected={selectedSpecificDates} onSelect={(dates) => setSelectedSpecificDates(dates || [])} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                {selectedSpecificDates.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedSpecificDates.sort((a, b) => a.getTime() - b.getTime()).map((date, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-0.5">
                        {format(date, 'MMM d, yyyy')}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Time - only for single date */}
            {dateMode === 'single' && (
              <div className="space-y-2">
                <label className="font-display text-xs text-muted-foreground tracking-widest block">TIME OF SHOW (OPTIONAL)</label>
                <Input type="time" value={selectedGigTime} onChange={e => setSelectedGigTime(e.target.value)} className="bg-background border-border" />
              </div>
            )}

            {/* Accept Type - only for single date */}
            {dateMode === 'single' && (
              <div className="space-y-3">
                <label className="font-display text-xs text-muted-foreground tracking-widest block">ACCEPTANCE TYPE</label>
                <RadioGroup value={acceptType} onValueChange={v => setAcceptType(v as 'confirmed' | 'hold')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="confirmed" id="confirmed" />
                    <Label htmlFor="confirmed" className="cursor-pointer font-display text-sm">CONFIRMED</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="hold" id="hold" />
                    <Label htmlFor="hold" className="cursor-pointer font-display text-sm">HOLD</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Hold note for range/specific */}
            {dateMode !== 'single' && (
              <p className="text-xs text-muted-foreground">All dates will be created as holds.</p>
            )}

            {/* Hold Priority - Only for single+hold with existing holds */}
            {dateMode === 'single' && acceptType === 'hold' && existingHolds.length > 0 && (
              <div className="space-y-2">
                <label className="font-display text-xs text-muted-foreground tracking-widest block">HOLD PRIORITY</label>
                <HoldsOrderList holds={existingHolds} newArtistName={bandName} onOrderChange={setHoldPriority} />
              </div>
            )}

            {/* Message to Artist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-display text-xs text-muted-foreground tracking-widest">MESSAGE TO ARTIST</label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={sendAcceptMessage} onChange={e => setSendAcceptMessage(e.target.checked)} className="rounded border-border" />
                  Send message
                </label>
              </div>
              <Textarea value={acceptMessage} onChange={e => setAcceptMessage(e.target.value)} disabled={!sendAcceptMessage} className="min-h-[100px] text-sm" placeholder="Message to the artist..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAcceptDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAccept}
                disabled={
                  dateMode === 'single' ? !selectedGigDate
                    : dateMode === 'range' ? !(selectedDateRange?.from && selectedDateRange?.to)
                    : selectedSpecificDates.length === 0
                }
                className="bg-primary hover:bg-primary/90"
              >
                {dateMode === 'single'
                  ? (acceptType === 'hold' ? `Accept Hold` : 'Accept & Confirm Gig')
                  : 'Accept Hold'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}