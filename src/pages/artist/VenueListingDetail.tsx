import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, MapPin, Users, Music, CalendarIcon, Heart, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';
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
type AvailabilityPreference = 'date_range' | 'specific_dates' | 'flexible';
type PaymentPreference = 'door_split' | 'bar_split' | 'tip_based' | 'flat_fee' | 'rental' | 'no_preference';
type LineupPreference = 'co_acts_needed' | 'co_acts_confirmed' | 'solo_performer';
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
export default function VenueListingDetail() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
  const {
    toggleFavorite,
    isFavorite
  } = useFavorites();
  const [listing, setListing] = useState<VenueListing | null>(null);
  const [venueProfile, setVenueProfile] = useState<VenueProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityPreference>('flexible');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [paymentPreferences, setPaymentPreferences] = useState<PaymentPreference[]>([]);
  const [lineup, setLineup] = useState<LineupPreference>('solo_performer');
  useEffect(() => {
    if (id) {
      fetchListing();
      checkExistingApplication();
    }
    if (user) {
      checkProfileComplete();
    }
  }, [id, user]);
  const checkProfileComplete = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('artist_profiles').select('band_name, location, genre, bio, pictures').eq('user_id', user.id).maybeSingle();
    if (data) {
      const hasRequiredFields = data.band_name && data.band_name.trim() !== '' && data.location && data.location.trim() !== '' && data.genre && data.genre.trim() !== '' && data.bio && data.bio.trim() !== '' && data.pictures && data.pictures.length > 0;
      setIsProfileComplete(!!hasRequiredFields);
    } else {
      setIsProfileComplete(false);
    }
  };
  const fetchListing = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('venue_listings').select('*').eq('id', id).maybeSingle();
    if (data && !error) {
      setListing(data as VenueListing);

      // Fetch venue profile for the general picture
      const {
        data: profileData
      } = await supabase.from('venue_profiles').select('id, picture').eq('id', data.venue_profile_id).maybeSingle();
      if (profileData) {
        setVenueProfile(profileData as VenueProfile);
      }
    }
    setLoading(false);
  };
  const checkExistingApplication = async () => {
    if (!user || !id) return;
    const {
      data
    } = await supabase.from('applications').select('id').eq('artist_id', user.id).eq('venue_listing_id', id).maybeSingle();
    setHasApplied(!!data);
  };
  const togglePayment = (payment: PaymentPreference) => {
    if (paymentPreferences.includes(payment)) {
      setPaymentPreferences(paymentPreferences.filter(p => p !== payment));
    } else {
      setPaymentPreferences([...paymentPreferences, payment]);
    }
  };
  const handleApply = async () => {
    if (!user || !listing) return;
    if (paymentPreferences.length === 0) {
      toast.error('Select at least one payment preference');
      return;
    }
    if (availability === 'date_range' && (!dateRange?.from || !dateRange?.to)) {
      toast.error('Select a date range');
      return;
    }
    if (availability === 'specific_dates' && specificDates.length === 0) {
      toast.error('Select at least one date');
      return;
    }
    setApplying(true);
    const {
      error
    } = await supabase.from('applications').insert({
      artist_id: user.id,
      venue_listing_id: listing.id,
      availability_preference: availability,
      payment_preference: paymentPreferences[0],
      lineup_preference: lineup,
      status: 'in_progress' as const,
      availability_start_date: availability === 'date_range' && dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
      availability_end_date: availability === 'date_range' && dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
      availability_specific_dates: availability === 'specific_dates' && specificDates.length > 0 ? specificDates.map(d => format(d, 'yyyy-MM-dd')) : null
    });
    if (error) {
      toast.error('Failed to apply');
      setApplying(false);
    } else {
      setShowSuccessDialog(true);
    }
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
      {/* Back Button & Favorite */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        {id && <Button variant="ghost" size="icon" onClick={() => toggleFavorite(id)} className="h-9 w-9">
            <Heart className={`h-6 w-6 transition-colors ${isFavorite(id) ? 'fill-primary text-primary' : 'text-muted-foreground hover:text-primary'}`} />
          </Button>}
      </div>

      {/* All Pictures Gallery - side by side */}
      <div className="mb-6">
        {(() => {
        const allPictures: string[] = [];
        if (venueProfile?.picture) allPictures.push(venueProfile.picture);
        if (listing.pictures && listing.pictures.length > 0) {
          allPictures.push(...listing.pictures);
        }
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

      {/* Venue Info - Full Width */}
      <div className="space-y-4 mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-accent font-bold tracking-wide">
            {listing.venue_name}
          </h1>
          {listing.room_name && <p className="text-lg text-muted-foreground mt-1">{listing.room_name}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
          {listing.location && <span className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {listing.location}
            </span>}
          {listing.capacity && <span className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {listing.capacity} capacity
            </span>}
        </div>

        {listing.genres && listing.genres.length > 0 && <div className="flex flex-wrap gap-2">
            {listing.genres.map(genre => <span key={genre} className="text-xs bg-secondary px-3 py-1 uppercase tracking-wider font-display">
                {genre}
              </span>)}
          </div>}
      </div>

      {/* Two Column Layout - Details & Apply */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column - Venue Details */}
        <div className="flex-1 space-y-4">
          {listing.backline_info && <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
              <p className="text-muted-foreground text-sm">{listing.backline_info}</p>
            </div>}
          {listing.house_rules && <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
              <p className="text-muted-foreground text-sm">{listing.house_rules}</p>
            </div>}
        </div>

        {/* Right Column - Sticky Apply Form */}
        <div className="lg:w-80 xl:w-96 order-first lg:order-last">
          <div className="lg:sticky lg:top-4">
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="font-display text-2xl text-accent font-bold">APPLY</h2>

              {hasApplied ? <div className="text-center py-8">
                  <p className="text-lg text-muted-foreground">You've already applied to this room</p>
                  <Button variant="outline" onClick={() => navigate('/artist/applications')} className="mt-4 font-display tracking-widest">
                    VIEW APPLICATIONS
                  </Button>
                </div> : isProfileComplete === false ? <div className="text-center py-4">
                  <button 
                    onClick={() => navigate('/artist/profile', { state: { fromVenueListing: true } })} 
                    className="text-lg text-accent font-display font-bold text-center hover:text-primary transition-colors cursor-pointer"
                  >
                    COMPLETE PROFILE BEFORE APPLYING
                  </button>
                </div> : <div className="relative">

                  {/* Availability */}
                  <div className="space-y-3">
                    <h3 className="font-display text-sm text-primary tracking-widest">AVAILABILITY</h3>
                    <RadioGroup value={availability} onValueChange={v => setAvailability(v as AvailabilityPreference)}>
                      <div className="flex flex-col gap-2">
                        {availabilityOptions.map(option => <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={`avail-${option.id}`} />
                            <Label htmlFor={`avail-${option.id}`} className="cursor-pointer">
                              {option.label}
                            </Label>
                          </div>)}
                      </div>
                    </RadioGroup>

                    {/* Date Range Picker */}
                    {availability === 'date_range' && <div className="mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? dateRange.to ? <>
                                    {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                                  </> : format(dateRange.from, "MMM d, yyyy") : <span>Select dates</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} disabled={date => date < new Date()} className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>}

                    {/* Specific Dates Picker */}
                    {availability === 'specific_dates' && <div className="mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", specificDates.length === 0 && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {specificDates.length > 0 ? <span>{specificDates.length} date{specificDates.length > 1 ? 's' : ''} selected</span> : <span>Select dates</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="multiple" selected={specificDates} onSelect={dates => setSpecificDates(dates || [])} disabled={date => date < new Date()} className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                        {specificDates.length > 0 && <div className="flex flex-wrap gap-2 mt-2">
                            {specificDates.map((date, index) => <span key={index} className="text-xs bg-secondary px-2 py-1 rounded">
                                {format(date, "MMM d")}
                              </span>)}
                          </div>}
                      </div>}
                  </div>

                  {/* Payment Preference */}
                  <div className="space-y-3 mt-6">
                    <h3 className="font-display text-sm text-primary tracking-widest">PAYMENT</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map(option => <div key={option.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${paymentPreferences.includes(option.id as PaymentPreference) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`} onClick={() => togglePayment(option.id as PaymentPreference)}>
                          <Checkbox checked={paymentPreferences.includes(option.id as PaymentPreference)} onCheckedChange={() => togglePayment(option.id as PaymentPreference)} className="h-4 w-4" />
                          <Label className="cursor-pointer text-sm">{option.label}</Label>
                        </div>)}
                    </div>
                  </div>

                  {/* Lineup */}
                  <div className="space-y-3 mt-6">
                    <h3 className="font-display text-sm text-primary tracking-widest">LINEUP</h3>
                    <RadioGroup value={lineup} onValueChange={v => setLineup(v as LineupPreference)}>
                      <div className="flex flex-col gap-2">
                        {lineupOptions.map(option => <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={`lineup-${option.id}`} />
                            <Label htmlFor={`lineup-${option.id}`} className="cursor-pointer">
                              {option.label}
                            </Label>
                          </div>)}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Submit */}
                  <Button onClick={handleApply} disabled={applying} className="w-full font-display tracking-widest text-lg py-6 mt-6">
                    {applying ? 'APPLYING...' : 'APPLY'}
                  </Button>
                </div>}
            </div>
          </div>
        </div>
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
              <CheckCircle className="h-10 w-10 text-primary" />
            </div>
            <DialogTitle className="font-display text-3xl text-accent tracking-wide">
              APPLICATION SUBMITTED
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground mt-2">
              Your application to {listing?.venue_name} has been sent. The venue will review your submission and get back to you.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={() => navigate('/artist/applications')} className="w-full font-display tracking-widest">
              VIEW MY APPLICATIONS
            </Button>
            <Button variant="outline" onClick={() => navigate('/artist')} className="w-full font-display tracking-widest">
              FIND MORE VENUES
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}