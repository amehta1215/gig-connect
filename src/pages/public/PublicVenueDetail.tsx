import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin, Music, Users, Heart } from 'lucide-react';
import AuthDialog from '@/components/AuthDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const availabilityOptions = [
  { id: 'date_range', label: 'Date Range' },
  { id: 'specific_dates', label: 'Specific Dates' },
  { id: 'flexible', label: 'Flexible' },
];
const paymentOptions = [
  { id: 'door_split', label: 'Door' },
  { id: 'bar_split', label: 'Bar' },
  { id: 'tip_based', label: 'Tips' },
  { id: 'flat_fee', label: 'Flat' },
  { id: 'rental', label: 'Rental' },
  { id: 'no_preference', label: 'Flexible' },
];
const lineupOptions = [
  { id: 'co_acts_needed', label: 'Co-acts Needed' },
  { id: 'co_acts_confirmed', label: 'Co-acts Confirmed' },
  { id: 'solo_performer', label: 'Solo' },
];

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
  const { profile, activeRole } = useAuth();
  const [listings, setListings] = useState<VenueListing[]>([]);
  const [venueProfile, setVenueProfile] = useState<VenueProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // Route authenticated artists to the artist venue detail page so they can apply.
  useEffect(() => {
    if (!id || !profile) return;
    const isArtist = profile.role === 'artist' || (profile.role === 'both' && activeRole === 'artist');
    if (isArtist) {
      navigate(`/artist/venue/${id}`, { replace: true });
    }
  }, [id, profile, activeRole, navigate]);

  const fetchData = async () => {
    setLoading(true);
    const { data: listingsData } = await supabase
      .from('venue_listings')
      .select('*')
      .eq('venue_profile_id', id);
    if (listingsData) setListings(listingsData as VenueListing[]);
    const { data: profileData } = await supabase
      .from('venue_profiles')
      .select('id, picture')
      .eq('id', id)
      .maybeSingle();
    if (profileData) setVenueProfile(profileData as VenueProfile);
    setLoading(false);
  };

  const handleAuthPrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAuthDialogOpen(true);
  };

  if (loading) {
    return <div className="space-y-6 animate-fade-in">
      <div className="h-64 bg-card animate-pulse rounded-lg" />
      <div className="h-8 w-48 bg-card animate-pulse rounded" />
      <div className="h-32 bg-card animate-pulse rounded-lg" />
    </div>;
  }

  if (listings.length === 0) {
    return <div className="text-center py-20">
      <h3 className="font-display text-2xl text-muted-foreground">VENUE NOT FOUND</h3>
      <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">Go Back</Button>
    </div>;
  }

  const shared = listings[0];
  const galleryPictures = Array.from(new Set(listings.flatMap(l => l.pictures || [])));

  const scroll = (dir: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const card = container.children[0] as HTMLElement;
    const cardWidth = card?.offsetWidth || 300;
    container.scrollBy({ left: dir === 'left' ? -cardWidth - 8 : cardWidth + 8, behavior: 'smooth' });
  };

  return <div className="animate-fade-in max-w-6xl mx-auto">
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleAuthPrompt} className="h-9 w-9">
        <Heart className="h-6 w-6 text-muted-foreground hover:text-[#E8556D] transition-colors" />
      </Button>
    </div>

    <div className="mb-6">
      {galleryPictures.length === 0 ? (
        <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-heat">
            <Music className="h-12 w-12 text-primary/30" />
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div ref={galleryScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth">
            {galleryPictures.map((pic, i) => (
              <div key={i} className="flex-shrink-0 w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                <img src={pic} alt={`${shared.venue_name} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {galleryPictures.length > 3 && <>
            <button onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <ChevronLeft className="h-5 w-5 text-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <ChevronRight className="h-5 w-5 text-foreground" />
            </button>
          </>}
        </div>
      )}
    </div>

    <div className="space-y-4 mb-8">
      <h1 className="font-display text-4xl md:text-5xl text-black font-bold tracking-wide">
        {shared.venue_name}
      </h1>
      {shared.location && (
        <div className="flex items-center gap-2 text-primary">
          <MapPin className="h-4 w-4" />
          {shared.location}
        </div>
      )}
    </div>

    <div className="flex flex-col lg:flex-row gap-8">
      <div className="flex-1 order-2 lg:order-1">
        <div className="space-y-4">
          {shared.bio && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-display text-sm text-primary tracking-widest mb-2">ABOUT</h3>
              <p className="text-sm text-primary whitespace-pre-line">{shared.bio}</p>
            </div>
          )}
          {shared.backline_info && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
              <p className="text-sm text-primary whitespace-pre-line">{shared.backline_info}</p>
            </div>
          )}
          {shared.house_rules && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
              <p className="text-sm text-primary whitespace-pre-line">{shared.house_rules}</p>
            </div>
          )}
        </div>
        <div className="mt-10">
          <h2 className="font-display text-2xl text-black font-bold tracking-wide mb-4">ROOMS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map(room => (
              <div
                key={room.id}
                onClick={() => navigate(`/rooms/${room.id}`)}
                className="group bg-card border border-border overflow-hidden transition-all hover:border-primary cursor-pointer relative"
              >
                <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                  {(() => {
                    const pic = (room.pictures && room.pictures[0]) || venueProfile?.picture || null;
                    return pic ? (
                      <img src={pic} alt={room.room_name || room.venue_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-heat">
                        <Music className="h-12 w-12 text-primary/30" />
                      </div>
                    );
                  })()}
                  {room.capacity && (
                    <div className="absolute top-2 left-2 bg-background/90 px-2 py-0.5 text-xs font-display tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.capacity}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors tracking-wide font-semibold">
                    {room.room_name || 'Main Room'}
                  </h3>
                  {room.genres && room.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {room.genres.slice(0, 3).map(genre => (
                        <span key={genre} className="text-[10px] px-2 py-0.5 uppercase tracking-wider text-primary bg-gray-200">
                          {genre.toLowerCase() === 'all' ? 'All Genres' : genre}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:w-80 xl:w-96 order-1 lg:order-2">
        <div className="lg:sticky lg:top-4">
          <div className="bg-card border border-border rounded-lg p-6 space-y-6" onClick={handleAuthPrompt}>
            <h2 className="font-display text-2xl font-bold text-primary">APPLY</h2>

            {listings.length > 1 && (
              <div className="space-y-3">
                <h3 className="font-display text-sm text-primary tracking-widest">ROOM</h3>
                <Select onOpenChange={(o) => { if (o) setAuthDialogOpen(true); }}>
                  <SelectTrigger onClick={handleAuthPrompt}>
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-display text-sm text-primary tracking-widest">AVAILABILITY</h3>
              <RadioGroup value="" onValueChange={() => setAuthDialogOpen(true)}>
                <div className="flex flex-col gap-2">
                  {availabilityOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={`pub-avail-${option.id}`} />
                      <Label htmlFor={`pub-avail-${option.id}`} className="cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3 mt-6">
              <h3 className="font-display text-sm text-primary tracking-widest">PAYMENT</h3>
              <div className="grid grid-cols-2 gap-2">
                {paymentOptions.map(option => (
                  <div
                    key={option.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-primary/50 cursor-pointer transition-colors text-sm"
                    onClick={handleAuthPrompt}
                  >
                    <Checkbox checked={false} onCheckedChange={() => setAuthDialogOpen(true)} className="h-4 w-4" />
                    <Label className="cursor-pointer text-sm">{option.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 mt-6">
              <h3 className="font-display text-sm text-primary tracking-widest">LINEUP</h3>
              <RadioGroup value="" onValueChange={() => setAuthDialogOpen(true)}>
                <div className="flex flex-col gap-2">
                  {lineupOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                      <RadioGroupItem value={option.id} id={`pub-lineup-${option.id}`} />
                      <Label htmlFor={`pub-lineup-${option.id}`} className="cursor-pointer">{option.label}</Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            <Button onClick={handleAuthPrompt} className="w-full font-display tracking-widest text-lg py-6 mt-6">
              APPLY
            </Button>
          </div>
        </div>
      </div>
    </div>

    <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} promptMessage="Login or sign up to save favorites" />
  </div>;
}
