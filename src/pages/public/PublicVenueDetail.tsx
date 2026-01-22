import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, MapPin, Users, Music } from 'lucide-react';

interface VenueListing {
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
}

interface VenueProfile {
  id: string;
  picture: string | null;
}

export default function PublicVenueDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<VenueListing | null>(null);
  const [venueProfile, setVenueProfile] = useState<VenueProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  const fetchListing = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('venue_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (data && !error) {
      setListing(data as VenueListing);

      const { data: profileData } = await supabase
        .from('venue_profiles')
        .select('id, picture')
        .eq('id', data.venue_profile_id)
        .maybeSingle();

      if (profileData) {
        setVenueProfile(profileData as VenueProfile);
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

  if (!listing) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">ROOM NOT FOUND</h3>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* All Pictures Gallery */}
      <div className="mb-6">
        {(() => {
          const allPictures: string[] = [];
          if (venueProfile?.picture) allPictures.push(venueProfile.picture);
          if (listing.pictures && listing.pictures.length > 0) {
            allPictures.push(...listing.pictures);
          }
          if (allPictures.length === 0) {
            return (
              <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
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
                  <img src={pic} alt={`${listing.venue_name} ${index + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          );
        })()}
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Venue Info */}
        <div className="flex-1 space-y-6">
          {/* Venue Info */}
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-4xl md:text-5xl text-accent font-bold tracking-wide">
                {listing.venue_name}
              </h1>
              {listing.room_name && <p className="text-lg text-muted-foreground mt-1">{listing.room_name}</p>}
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
                {listing.genres.map(genre => (
                  <span key={genre} className="text-xs bg-secondary px-3 py-1 uppercase tracking-wider font-display">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
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
        </div>

        {/* Right Column - Login to Apply */}
        <div className="lg:w-80 xl:w-96">
          <div className="lg:sticky lg:top-20">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="font-display text-2xl text-accent font-bold">APPLY</h2>

              {/* Auth Required Overlay */}
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xl text-accent font-display font-bold mb-6">
                  LOGIN OR SIGN UP TO APPLY
                </p>
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="font-display tracking-widest" 
                  size="lg"
                >
                  LOGIN / SIGN UP
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
