import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, MapPin, Music, Users, ChevronLeft, ChevronRight, CalendarIcon, CheckCircle } from 'lucide-react';
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
  pictures?: string[] | null;
}

type AvailabilityPreference = 'date_range' | 'specific_dates' | 'flexible';
type PaymentPreference = 'door_split' | 'bar_split' | 'tip_based' | 'flat_fee' | 'rental' | 'no_preference';
type LineupPreference = 'co_acts_needed' | 'co_acts_confirmed' | 'solo_performer';

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

export default function VenueDetail() {
  const { venueProfileId } = useParams<{ venueProfileId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [listings, setListings] = useState<VenueListing[]>([]);
  const [venueProfile, setVenueProfile] = useState<VenueProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const [applying, setApplying] = useState(false);
  const [inProgressApplicationId, setInProgressApplicationId] = useState<string | null>(null);
  const [priorApplications, setPriorApplications] = useState<{ id: string; created_at: string }[]>([]);
  const [priorDialogOpen, setPriorDialogOpen] = useState(false);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [availability, setAvailability] = useState<AvailabilityPreference | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [specificDates, setSpecificDates] = useState<Date[]>([]);
  const [paymentPreferences, setPaymentPreferences] = useState<PaymentPreference[]>([]);
  const [lineup, setLineup] = useState<LineupPreference>('solo_performer');

  const galleryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (venueProfileId) fetchData();
  }, [venueProfileId]);

  useEffect(() => {
    if (user) checkProfileComplete();
  }, [user]);

  useEffect(() => {
    if (selectedListingId && user) checkExistingApplication();
  }, [selectedListingId, user]);

  const fetchData = async () => {
    setLoading(true);
    const { data: listingsData } = await supabase
      .from('venue_listings')
      .select('*')
      .eq('venue_profile_id', venueProfileId);
    if (listingsData) {
      const sorted = listingsData as VenueListing[];
      setListings(sorted);
      if (sorted.length > 0) setSelectedListingId(sorted[0].id);
    }
    const { data: profileData } = await supabase
      .from('venue_profiles')
      .select('id, picture, pictures')
      .eq('id', venueProfileId)
      .maybeSingle();
    if (profileData) setVenueProfile(profileData as VenueProfile);
    setLoading(false);
  };

  const checkProfileComplete = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('artist_profiles')
      .select('band_name, location, genre, bio, pictures')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const hasRequiredFields =
        data.band_name && data.band_name.trim() !== '' &&
        data.location && data.location.trim() !== '' &&
        data.genre && data.genre.trim() !== '' &&
        data.bio && data.bio.trim() !== '' &&
        data.pictures && data.pictures.length > 0;
      setIsProfileComplete(!!hasRequiredFields);
    } else {
      setIsProfileComplete(false);
    }
  };

  const checkExistingApplication = async () => {
    if (!user || !selectedListingId) return;
    const { data } = await supabase
      .from('applications')
      .select('id, status, created_at')
      .eq('artist_id', user.id)
      .eq('venue_listing_id', selectedListingId)
      .order('created_at', { ascending: false });
    if (!data || data.length === 0) {
      setInProgressApplicationId(null);
      setPriorApplications([]);
      return;
    }
    const inProgress = data.find(a => a.status === 'in_progress');
    setInProgressApplicationId(inProgress?.id || null);
    setPriorApplications(
      data
        .filter(a => a.status !== 'in_progress')
        .map(a => ({ id: a.id, created_at: a.created_at }))
    );
  };

  const selectedListing = listings.find(l => l.id === selectedListingId);

  const togglePayment = (payment: PaymentPreference) => {
    if (paymentPreferences.includes(payment)) {
      setPaymentPreferences(paymentPreferences.filter(p => p !== payment));
    } else {
      setPaymentPreferences([...paymentPreferences, payment]);
    }
  };

  const handleApply = async () => {
    if (!user || !selectedListing) return;
    if (!availability) {
      toast.error('Select an availability preference');
      return;
    }
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
    const { error } = await supabase.from('applications').insert({
      artist_id: user.id,
      venue_listing_id: selectedListing.id,
      availability_preference: availability,
      payment_preference: paymentPreferences[0],
      lineup_preference: lineup,
      status: 'in_progress' as const,
      availability_start_date: availability === 'date_range' && dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null,
      availability_end_date: availability === 'date_range' && dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : null,
      availability_specific_dates: availability === 'specific_dates' && specificDates.length > 0 ? specificDates.map(d => format(d, 'yyyy-MM-dd')) : null,
    });
    if (error) {
      console.error('Application error:', error);
      toast.error(`Failed to apply: ${error.message}`);
      setApplying(false);
    } else {
      setShowSuccessDialog(true);
    }
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

  if (listings.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">VENUE NOT FOUND</h3>
        <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">Go Back</Button>
      </div>
    );
  }

  const shared = listings[0];
  const venuePics = (venueProfile?.pictures && venueProfile.pictures.length > 0)
    ? venueProfile.pictures
    : (venueProfile?.picture ? [venueProfile.picture] : []);
  const galleryPictures = Array.from(new Set([
    ...venuePics,
    ...listings.flatMap(l => l.pictures || [])
  ]));

  const scroll = (dir: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const card = container.children[0] as HTMLElement;
    const cardWidth = card?.offsetWidth || 300;
    container.scrollBy({ left: dir === 'left' ? -cardWidth - 8 : cardWidth + 8, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Gallery */}
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
            {galleryPictures.length > 3 && (
              <>
                <button onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Venue name/location */}
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

      {/* About/Backline/House Rules + Apply */}
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
                  onClick={() => navigate(`/artist/venues/${room.id}`)}
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
            <div className="bg-card border border-border rounded-lg p-6 space-y-6">
              <h2 className="font-display text-2xl font-bold text-primary">APPLY</h2>

              {listings.length > 1 && (
                <div className="space-y-3">
                  <h3 className="font-display text-sm text-primary tracking-widest">ROOM</h3>
                  <Select value={selectedListingId || ''} onValueChange={setSelectedListingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a room" />
                    </SelectTrigger>
                    <SelectContent>
                      {listings.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.room_name || 'Main Room'}
                          {room.capacity ? ` • ${room.capacity}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {inProgressApplicationId ? (
                <div className="text-center">
                  <p className="text-muted-foreground">You've already applied to this room</p>
                  <Button variant="outline" onClick={() => navigate(`/artist/applications/${inProgressApplicationId}`)} className="mt-3 font-display tracking-widest">
                    VIEW APPLICATION
                  </Button>
                </div>
              ) : isProfileComplete === false ? (
                <div className="text-center py-4">
                  <button
                    onClick={() => navigate('/artist/profile', { state: { fromVenueListing: true } })}
                    className="text-lg text-accent font-display font-bold text-center hover:text-primary transition-colors cursor-pointer"
                  >
                    COMPLETE PROFILE BEFORE APPLYING
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {priorApplications.length > 0 && (
                    <p className="text-xs text-muted-foreground mb-4">
                      You've applied to this room before.{" "}
                      <button
                        type="button"
                        onClick={() => {
                          if (priorApplications.length === 1) {
                            navigate(`/artist/applications/${priorApplications[0].id}`);
                          } else {
                            setPriorDialogOpen(true);
                          }
                        }}
                        className="underline hover:text-primary transition-colors"
                      >
                        View prior applications
                      </button>
                    </p>
                  )}

                  {/* Availability */}
                  <div className="space-y-3">
                    <h3 className="font-display text-sm text-primary tracking-widest">AVAILABILITY</h3>
                    <RadioGroup value={availability || ''} onValueChange={v => setAvailability(v as AvailabilityPreference)}>
                      <div className="flex flex-col gap-2">
                        {availabilityOptions.map(option => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={`avail-${option.id}`} />
                            <Label htmlFor={`avail-${option.id}`} className="cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>

                    {availability === 'date_range' && (
                      <div className="mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateRange?.from ? dateRange.to ? <>{format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}</> : format(dateRange.from, "MMM d, yyyy") : <span>Select dates</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={1} disabled={date => date < new Date()} className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}

                    {availability === 'specific_dates' && (
                      <div className="mt-3">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-auto min-h-10 py-2", specificDates.length === 0 && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                              {specificDates.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {specificDates.sort((a, b) => a.getTime() - b.getTime()).map((date, index) => (
                                    <span key={index} className="text-xs bg-secondary px-2 py-0.5 rounded">
                                      {format(date, "MMM d")}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span>Select dates</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar initialFocus mode="multiple" selected={specificDates} onSelect={dates => setSpecificDates(dates || [])} disabled={date => date < new Date()} className={cn("p-3 pointer-events-auto")} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                  </div>

                  {/* Payment Preference */}
                  <div className="space-y-3 mt-6">
                    <h3 className="font-display text-sm text-primary tracking-widest">PAYMENT</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentOptions.map(option => (
                        <div
                          key={option.id}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors text-sm ${paymentPreferences.includes(option.id as PaymentPreference) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                          onClick={() => togglePayment(option.id as PaymentPreference)}
                        >
                          <Checkbox checked={paymentPreferences.includes(option.id as PaymentPreference)} onCheckedChange={() => togglePayment(option.id as PaymentPreference)} className="h-4 w-4" />
                          <Label className="cursor-pointer text-sm">{option.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lineup */}
                  <div className="space-y-3 mt-6">
                    <h3 className="font-display text-sm text-primary tracking-widest">LINEUP</h3>
                    <RadioGroup value={lineup} onValueChange={v => setLineup(v as LineupPreference)}>
                      <div className="flex flex-col gap-2">
                        {lineupOptions.map(option => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={`lineup-${option.id}`} />
                            <Label htmlFor={`lineup-${option.id}`} className="cursor-pointer">
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Submit */}
                  <Button onClick={handleApply} disabled={applying} className="w-full font-display tracking-widest text-lg py-6 mt-6">
                    {applying ? 'APPLYING...' : 'APPLY'}
                  </Button>
                </div>
              )}
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
              Your application to {selectedListing?.venue_name} has been sent. The venue will review your submission and get back to you.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-6">
            <Button onClick={() => navigate('/artist')} className="w-full font-display tracking-widest">
              FIND MORE VENUES
            </Button>
            <Button variant="outline" onClick={() => navigate('/artist/applications')} className="w-full font-display tracking-widest">
              VIEW MY APPLICATIONS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Prior Applications Dialog */}
      <Dialog open={priorDialogOpen} onOpenChange={setPriorDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display tracking-wide">PRIOR APPLICATIONS</DialogTitle>
            <DialogDescription>Your previous applications to this room.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            {priorApplications.map(app => (
              <button
                key={app.id}
                type="button"
                onClick={() => {
                  setPriorDialogOpen(false);
                  navigate(`/artist/applications/${app.id}`);
                }}
                className="text-left px-3 py-2 border border-border rounded-md hover:border-primary hover:bg-secondary transition-colors text-sm"
              >
                Application on {format(new Date(app.created_at), 'MMM d, yyyy')}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
