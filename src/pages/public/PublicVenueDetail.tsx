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
import VenueProfilePreviewContent from '@/components/VenueProfilePreviewContent';

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
  pictures?: string[] | null;
  genres?: string[] | null;
  bio?: string | null;
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
      .select('id, picture, pictures, genres, bio')
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

  const applyPanel = (
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
  );

  return <div className="animate-fade-in max-w-6xl mx-auto">
    <div className="flex items-center justify-between mb-6">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <Button variant="ghost" size="icon" onClick={handleAuthPrompt} className="h-9 w-9">
        <Heart className="h-6 w-6 text-muted-foreground hover:text-[#E8556D] transition-colors" />
      </Button>
    </div>

    <VenueProfilePreviewContent
      venueProfile={venueProfile}
      listings={listings}
      sidebar={applyPanel}
      onRoomClick={(room) => navigate(`/rooms/${room.id}`)}
    />

    <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} promptMessage="Login or sign up to save favorites" />
  </div>;
}
