import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Users, Music, CalendarIcon } from 'lucide-react';
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
const availabilityOptions = [{
  id: 'date_range',
  label: 'Date Range'
}, {
  id: 'specific_dates',
  label: 'Specific Dates'
}, {
  id: 'flexible',
  label: 'Flexible'
}];
const paymentOptions = [{
  id: 'door_split',
  label: 'Door'
}, {
  id: 'bar_split',
  label: 'Bar'
}, {
  id: 'tip_based',
  label: 'Tips'
}, {
  id: 'flat_fee',
  label: 'Flat'
}, {
  id: 'rental',
  label: 'Rental'
}, {
  id: 'no_preference',
  label: 'Flexible'
}];
const lineupOptions = [{
  id: 'co_acts_needed',
  label: 'Co-acts Needed'
}, {
  id: 'co_acts_confirmed',
  label: 'Co-acts Confirmed'
}, {
  id: 'solo_performer',
  label: 'Solo'
}];
export default function PublicVenueDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<VenueListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);
  const fetchListing = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('venue_listings').select('*').eq('id', id).maybeSingle();
    if (data && !error) {
      setListing(data as VenueListing);
    }
    setLoading(false);
  };
  const handleInteraction = (e: React.MouseEvent) => {
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
  if (!listing) {
    return <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">ROOM NOT FOUND</h3>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>;
  }
  return <div className="animate-fade-in max-w-6xl mx-auto">
      {/* Back Button */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* All Pictures Gallery */}
      <div className="mb-6">
        {(() => {
        const allPictures: string[] = listing.pictures || [];
        if (allPictures.length === 0) {
          return <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-heat">
                  <Music className="h-12 w-12 text-primary/30" />
                </div>
              </div>;
        }
        return <div className="flex flex-wrap justify-center gap-2">
              {allPictures.map((pic, index) => <div key={index} className="w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                  <img src={pic} alt={`${listing.venue_name} ${index + 1}`} className="w-full h-full object-cover" />
                </div>)}
            </div>;
      })()}
      </div>

      {/* Two Column Layout */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Venue Info */}
        <div className="flex-1 space-y-6">
          {/* Venue Info */}
          <div className="space-y-4">
            <div>
              <h1 className="font-display text-4xl md:text-5xl text-black font-bold tracking-wide">
                {listing.venue_name}
              </h1>
              {listing.room_name && <p className="text-lg mt-1 text-primary">{listing.room_name}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {listing.location && <span className="flex items-center gap-2 text-primary">
                  <MapPin className="h-4 w-4" />
                  {listing.location}
                </span>}
              {listing.capacity && <span className="flex items-center gap-2 text-primary">
                  <Users className="h-4 w-4 text-primary" />
                  {listing.capacity} capacity
                </span>}
            </div>

            {listing.genres && listing.genres.length > 0 && <div className="flex flex-wrap gap-2">
                {listing.genres.map(genre => <span key={genre} className="text-xs bg-secondary px-3 py-1 uppercase tracking-wider font-display">
                    {genre}
                  </span>)}
              </div>}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {listing.bio && <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">ABOUT</h3>
                <p className="text-sm text-primary">{listing.bio}</p>
              </div>}
            {listing.backline_info && <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
                <p className="text-sm text-primary">{listing.backline_info}</p>
              </div>}
            {listing.house_rules && <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
                <p className="text-sm text-primary">{listing.house_rules}</p>
              </div>}
          </div>
        </div>

        {/* Right Column - Apply Form (with auth intercept) */}
        <div className="lg:w-80 xl:w-96">
          <div className="lg:sticky lg:top-20">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="font-display text-2xl text-black font-bold">APPLY</h2>

              {/* Availability */}
              <div className="space-y-3" onClick={handleInteraction}>
                <h3 className="font-display text-sm text-primary tracking-widest">AVAILABILITY</h3>
                <RadioGroup className="pointer-events-none">
                  <div className="flex flex-col gap-2">
                    {availabilityOptions.map(option => <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={`public-avail-${option.id}`} />
                        <Label htmlFor={`public-avail-${option.id}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>)}
                  </div>
                </RadioGroup>

                {/* Date picker placeholder */}
                <Button variant="outline" className="w-full justify-start text-left font-normal text-muted-foreground pointer-events-none">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>Select dates</span>
                </Button>
              </div>

              {/* Payment Preference */}
              <div className="space-y-3" onClick={handleInteraction}>
                <h3 className="font-display text-sm text-primary tracking-widest">PAYMENT</h3>
                <div className="grid grid-cols-2 gap-2 pointer-events-none">
                  {paymentOptions.map(option => <div key={option.id} className="flex items-center gap-2 p-2 rounded-lg border border-border text-sm">
                      <Checkbox className="h-4 w-4" />
                      <Label className="cursor-pointer text-sm">{option.label}</Label>
                    </div>)}
                </div>
              </div>

              {/* Lineup */}
              <div className="space-y-3" onClick={handleInteraction}>
                <h3 className="font-display text-sm text-primary tracking-widest">LINEUP</h3>
                <RadioGroup className="pointer-events-none">
                  <div className="flex flex-col gap-2">
                    {lineupOptions.map(option => <div key={option.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.id} id={`public-lineup-${option.id}`} />
                        <Label htmlFor={`public-lineup-${option.id}`} className="cursor-pointer">
                          {option.label}
                        </Label>
                      </div>)}
                  </div>
                </RadioGroup>
              </div>

              {/* Submit Button */}
              <Button onClick={handleInteraction} className="w-full font-display tracking-widest text-lg py-6 bg-accent hover:bg-accent/90 text-accent-foreground">
                APPLY
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Required Dialog */}
      <Dialog open={authDialogOpen} onOpenChange={setAuthDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-accent tracking-wide">
              Login or sign up to apply
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create an account or sign in to submit your application
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => navigate('/auth')} className="w-full font-display tracking-widest text-lg h-12 mt-4">
            LOGIN / SIGN UP
          </Button>
        </DialogContent>
      </Dialog>
    </div>;
}