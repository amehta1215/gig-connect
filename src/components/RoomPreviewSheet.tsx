import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Music, CalendarIcon } from 'lucide-react';

interface RoomPreviewData {
  venue_name: string;
  room_name: string;
  location: string;
  capacity: string;
  genres: string[];
  backline_info: string;
  house_rules: string;
  pictures: string[];
  venueProfilePicture?: string | null;
}

interface RoomPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RoomPreviewData;
}

const availabilityOptions = [
  { id: 'date_range', label: 'Date Range' },
  { id: 'specific_dates', label: 'Specific Dates' },
  { id: 'flexible', label: 'Flexible' }
];

const paymentOptions = [
  { id: 'door_split', label: 'Door' },
  { id: 'bar_split', label: 'Bar' },
  { id: 'tip_based', label: 'Tips' },
  { id: 'flat_fee', label: 'Flat' },
  { id: 'rental', label: 'Rental' },
  { id: 'no_preference', label: 'Flexible' }
];

const lineupOptions = [
  { id: 'co_acts_needed', label: 'Co-acts Needed' },
  { id: 'co_acts_confirmed', label: 'Co-acts Confirmed' },
  { id: 'solo_performer', label: 'Solo' }
];

export function RoomPreviewSheet({ open, onOpenChange, data }: RoomPreviewSheetProps) {
  // Combine venue profile picture and room pictures
  const allPictures: string[] = [];
  if (data.venueProfilePicture) allPictures.push(data.venueProfilePicture);
  if (data.pictures && data.pictures.length > 0) {
    allPictures.push(...data.pictures);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-sm text-primary tracking-widest">
            ARTIST VIEW PREVIEW
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* Pictures Gallery */}
          <div>
            {allPictures.length === 0 ? (
              <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-heat">
                  <Music className="h-12 w-12 text-primary/30" />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-2">
                {allPictures.map((pic, index) => (
                  <div 
                    key={index} 
                    className="w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden"
                  >
                    <img 
                      src={pic} 
                      alt={`${data.venue_name} ${index + 1}`} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Column - Venue Info */}
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <div>
                  <h1 className="font-display text-3xl text-accent font-bold tracking-wide">
                    {data.venue_name || 'Venue Name'}
                  </h1>
                  {data.room_name && (
                    <p className="text-lg text-muted-foreground mt-1">{data.room_name}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  {data.location && (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {data.location}
                    </span>
                  )}
                  {data.capacity && (
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {data.capacity} capacity
                    </span>
                  )}
                </div>

                {data.genres && data.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {data.genres.map(genre => (
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

              {/* Details */}
              <div className="space-y-4">
                {data.backline_info && (
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
                    <p className="text-muted-foreground text-sm">{data.backline_info}</p>
                  </div>
                )}
                {data.house_rules && (
                  <div className="bg-background border border-border rounded-lg p-4">
                    <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
                    <p className="text-muted-foreground text-sm">{data.house_rules}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Apply Form Preview */}
            <div className="lg:w-72">
              <div className="bg-background border border-border rounded-lg p-6 space-y-6">
                <h2 className="font-display text-2xl text-accent font-bold">APPLY</h2>

                {/* Availability */}
                <div className="space-y-3">
                  <h3 className="font-display text-sm text-primary tracking-widest">AVAILABILITY</h3>
                  <RadioGroup defaultValue="flexible" disabled>
                    <div className="flex flex-col gap-2">
                      {availabilityOptions.map(option => (
                        <div key={option.id} className="flex items-center space-x-2 opacity-70">
                          <RadioGroupItem value={option.id} id={`preview-avail-${option.id}`} />
                          <Label htmlFor={`preview-avail-${option.id}`} className="cursor-default text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>

                  {/* Date picker placeholder */}
                  <Button variant="outline" className="w-full justify-start text-left font-normal text-muted-foreground" disabled>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    <span>Select dates</span>
                  </Button>
                </div>

                {/* Payment Preference */}
                <div className="space-y-3">
                  <h3 className="font-display text-sm text-primary tracking-widest">PAYMENT</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {paymentOptions.map(option => (
                      <div 
                        key={option.id} 
                        className="flex items-center gap-2 p-2 rounded-lg border border-border text-sm opacity-70"
                      >
                        <Checkbox className="h-4 w-4" disabled />
                        <Label className="cursor-default text-sm">{option.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lineup */}
                <div className="space-y-3">
                  <h3 className="font-display text-sm text-primary tracking-widest">LINEUP</h3>
                  <RadioGroup defaultValue="solo_performer" disabled>
                    <div className="flex flex-col gap-2">
                      {lineupOptions.map(option => (
                        <div key={option.id} className="flex items-center space-x-2 opacity-70">
                          <RadioGroupItem value={option.id} id={`preview-lineup-${option.id}`} />
                          <Label htmlFor={`preview-lineup-${option.id}`} className="cursor-default text-sm">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Submit Button */}
                <Button disabled className="w-full font-display tracking-widest text-lg py-6">
                  APPLY
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
