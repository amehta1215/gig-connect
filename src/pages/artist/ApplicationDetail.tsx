import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Users, Music, Calendar, Clock, CheckCircle2, Archive } from 'lucide-react';
import { format } from 'date-fns';

interface ApplicationData {
  id: string;
  status: 'in_progress' | 'accepted' | 'archived';
  created_at: string;
  message: string | null;
  availability_preference: 'date_range' | 'specific_dates' | 'flexible' | null;
  availability_start_date: string | null;
  availability_end_date: string | null;
  availability_specific_dates: string[] | null;
  payment_preference: string | null;
  lineup_preference: string | null;
  venue_listing: {
    id: string;
    venue_name: string;
    room_name: string | null;
    location: string | null;
    capacity: number | null;
    genres: string[];
    pictures: string[];
    bio: string | null;
    backline_info: string | null;
    house_rules: string | null;
    venue_profile_id: string;
  };
}

interface VenueProfile {
  id: string;
  picture: string | null;
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

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [venueProfile, setVenueProfile] = useState<VenueProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchApplication();
    }
  }, [id, user]);

  const fetchApplication = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        venue_listing:venue_listings(*)
      `)
      .eq('id', id)
      .eq('artist_id', user?.id)
      .maybeSingle();

    if (data && !error) {
      const appData = data as unknown as ApplicationData;
      setApplication(appData);
      
      // Fetch venue profile for the general picture
      if (appData.venue_listing?.venue_profile_id) {
        const { data: profileData } = await supabase
          .from('venue_profiles')
          .select('id, picture')
          .eq('id', appData.venue_listing.venue_profile_id)
          .maybeSingle();
        
        if (profileData) {
          setVenueProfile(profileData as VenueProfile);
        }
      }
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-64 bg-card animate-pulse rounded-lg" />
        <div className="h-8 w-48 bg-card animate-pulse rounded" />
        <div className="h-32 bg-card animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">APPLICATION NOT FOUND</h3>
        <Button onClick={() => navigate('/artist/applications')} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const config = statusConfig[application.status];
  const StatusIcon = config.icon;
  const listing = application.venue_listing;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" size="icon" onClick={() => navigate('/artist/applications')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Status Banner */}
      <div className={`flex items-center gap-2 px-4 py-2 ${config.bgColor} ${config.color} font-display tracking-widest text-sm`}>
        <StatusIcon className="h-4 w-4" />
        {config.label}
        <span className="text-muted-foreground ml-2">
          Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
        </span>
      </div>

      {/* Pictures Gallery */}
      <div className="mb-6">
        {(() => {
          const allPictures: string[] = [];
          if (venueProfile?.picture) allPictures.push(venueProfile.picture);
          if (listing.pictures && listing.pictures.length > 0) {
            allPictures.push(...listing.pictures);
          }
          
          if (allPictures.length === 0) {
            return (
              <div className="aspect-[4/3] max-w-xs mx-auto bg-secondary rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-heat">
                  <Music className="h-12 w-12 text-primary/30" />
                </div>
              </div>
            );
          }
          
          return (
            <div className="flex flex-wrap justify-center gap-2">
              {allPictures.map((pic, index) => (
                <div key={index} className="w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                  <img
                    src={pic}
                    alt={`${listing.venue_name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Venue Info */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-accent font-bold tracking-wide">
            {listing.venue_name}
          </h1>
          {listing.room_name && (
            <p className="text-lg text-muted-foreground mt-1">{listing.room_name}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {listing.location && (
            <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {listing.location}
            </span>
          )}
          {listing.capacity && (
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {listing.capacity} capacity
            </span>
          )}
        </div>

        {listing.genres && listing.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {listing.genres.map((genre) => (
              <span
                key={genre}
                className="text-xs bg-secondary px-3 py-1 uppercase tracking-wider font-display"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Venue Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {listing.backline_info && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
            <p className="text-muted-foreground text-sm">{listing.backline_info}</p>
          </div>
        )}
        {listing.house_rules && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
            <p className="text-muted-foreground text-sm">{listing.house_rules}</p>
          </div>
        )}
      </div>

      {/* Your Application */}
      <div className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="font-display text-2xl text-accent font-bold">YOUR APPLICATION</h2>

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
                {format(new Date(application.availability_start_date), 'MMM d')} - {format(new Date(application.availability_end_date), 'MMM d, yyyy')}
              </p>
            )}
            {application.availability_preference === 'specific_dates' && application.availability_specific_dates && application.availability_specific_dates.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {application.availability_specific_dates.map((date, i) => (
                  <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded">
                    {format(new Date(date), 'MMM d')}
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
            <p className="text-muted-foreground text-sm">{application.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
