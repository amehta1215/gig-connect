import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Music } from 'lucide-react';
import { format } from 'date-fns';

interface Opener {
  type: 'riff' | 'external';
  artist_id?: string;
  name: string;
}

interface GigData {
  id: string;
  gig_date: string;
  notes: string | null;
  openers: Opener[];
  venue_listing_id: string;
  artist_id: string;
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

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" size="icon" onClick={() => navigate('/artist/calendar')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

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

        {/* Date */}
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
        </div>

        {/* Headliner */}
        <div className="text-center border-y-2 border-border py-6">
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
            {venueListing?.room_name 
              ? `${venueListing.room_name} at ${venueListing.venue_name}`
              : venueListing?.venue_name}
          </p>
          {venueListing?.location && (
            <p className="text-muted-foreground mt-2">
              {venueListing.location}
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
      </div>
    </div>
  );
}
