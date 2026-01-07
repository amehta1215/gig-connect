import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Music, Calendar, Clock, CheckCircle2, Archive, ExternalLink, Globe } from 'lucide-react';
import { format } from 'date-fns';

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

  const updateStatus = async (newStatus: 'accepted' | 'archived') => {
    if (!application) return;
    
    await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', application.id);
    
    setApplication({ ...application, status: newStatus });
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
        <Button onClick={() => navigate('/venue/applications')} variant="outline" className="mt-4">
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
      <Button variant="ghost" size="icon" onClick={() => navigate('/venue/applications')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Status Banner */}
      <div className={`flex items-center justify-between gap-2 px-4 py-2 ${config.bgColor} ${config.color}`}>
        <div className="flex items-center gap-2 font-display tracking-widest text-sm">
          <StatusIcon className="h-4 w-4" />
          {config.label}
          <span className="text-muted-foreground ml-2">
            Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
          </span>
        </div>
        <div className="flex gap-2">
          {application.status !== 'accepted' && (
            <Button size="sm" onClick={() => updateStatus('accepted')} className="bg-green-600 hover:bg-green-700 text-white">
              Accept
            </Button>
          )}
          {application.status !== 'archived' && (
            <Button size="sm" variant="outline" onClick={() => updateStatus('archived')}>
              Archive
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

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {artistProfile?.location && (
            <span>{artistProfile.location}</span>
          )}
          {artistProfile?.location && artistProfile?.genre && (
            <span>•</span>
          )}
          {artistProfile?.genre && (
            <span>{artistProfile.genre}</span>
          )}
        </div>
      </div>

      {/* Artist Pictures */}
      {artistProfile?.pictures && artistProfile.pictures.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {artistProfile.pictures.slice(0, 6).map((pic, i) => (
            <div key={i} className="aspect-square bg-secondary overflow-hidden">
              <img src={pic} alt={`${bandName} photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
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
                <Globe className="h-3 w-3" />
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

        <div className="grid gap-4 md:grid-cols-3">
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
    </div>
  );
}
