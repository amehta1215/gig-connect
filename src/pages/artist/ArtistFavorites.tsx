import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { MapPin, Users, Music, Heart } from 'lucide-react';
interface VenueListing {
  id: string;
  venue_name: string;
  room_name: string | null;
  location: string | null;
  capacity: number | null;
  genres: string[];
  pictures: string[];
}
export default function ArtistFavorites() {
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    favoriteIds,
    toggleFavorite,
    isFavorite
  } = useFavorites();
  const [venues, setVenues] = useState<VenueListing[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchFavoriteVenues();
  }, [favoriteIds]);
  const fetchFavoriteVenues = async () => {
    if (favoriteIds.size === 0) {
      setVenues([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('venue_listings').select('*').in('id', Array.from(favoriteIds));
    if (data && !error) {
      setVenues(data as VenueListing[]);
    }
    setLoading(false);
  };
  const handleToggleFavorite = async (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    await toggleFavorite(venueId);
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="bg-card h-56 animate-pulse" />)}
        </div>
      </div>;
  }
  if (venues.length === 0) {
    return <div className="text-center py-20">
        <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-display text-2xl text-muted-foreground">NO FAVORITES YET</h3>
        <p className="text-muted-foreground mt-2">Browse venues and click the heart to save them here</p>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="font-display text-4xl font-black text-primary">FAVORITES</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {venues.map(venue => <div key={venue.id} onClick={() => navigate(`/artist/venues/${venue.id}`)} className="group bg-card border border-border overflow-hidden transition-all hover:border-primary cursor-pointer relative">
            {/* Capacity badge */}
            {venue.capacity && <div className="absolute top-2 left-2 z-10 bg-background/90 px-2 py-0.5 text-xs font-display tracking-wider flex items-center gap-1">
                <Users className="h-3 w-3" />
                {venue.capacity}
              </div>}

            {/* Image */}
            <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
              {venue.pictures && venue.pictures.length > 0 ? <img src={venue.pictures[0]} alt={venue.venue_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center bg-heat">
                  <Music className="h-12 w-12 text-primary/30" />
                </div>}
              {/* Favorite Button */}
              <button onClick={e => handleToggleFavorite(e, venue.id)} className="absolute top-2 right-2 z-10 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors">
                <Heart className={`h-5 w-5 transition-colors ${isFavorite(venue.id) ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'}`} />
              </button>
            </div>

            {/* Content */}
            <div className="p-3">
              <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors tracking-wide">
                {venue.venue_name}
              </h3>
              {venue.room_name && <p className="text-sm font-bold text-primary uppercase tracking-wide mt-0.5">
                  {venue.room_name}
                </p>}
              {venue.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {venue.location}
                </p>}
              {venue.genres && venue.genres.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                  {venue.genres.slice(0, 2).map(genre => <span key={genre} className="text-[10px] bg-secondary px-2 py-0.5 text-muted-foreground uppercase tracking-wider">
                      {genre.toLowerCase() === 'all' ? 'All Genres' : genre}
                    </span>)}
                </div>}
            </div>
          </div>)}
      </div>
    </div>;
}