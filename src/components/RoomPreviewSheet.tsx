import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Users, Music } from 'lucide-react';

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

export function RoomPreviewSheet({ open, onOpenChange, data }: RoomPreviewSheetProps) {
  // Combine venue profile picture and room pictures
  const allPictures: string[] = [];
  if (data.venueProfilePicture) allPictures.push(data.venueProfilePicture);
  if (data.pictures && data.pictures.length > 0) {
    allPictures.push(...data.pictures);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="flex flex-wrap gap-2">
                {allPictures.map((pic, index) => (
                  <div 
                    key={index} 
                    className="w-[calc(50%-0.25rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden"
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

          {/* Venue Info */}
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
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
                <p className="text-muted-foreground text-sm">{data.backline_info}</p>
              </div>
            )}
            {data.house_rules && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
                <p className="text-muted-foreground text-sm">{data.house_rules}</p>
              </div>
            )}
          </div>

          {/* Apply Box Preview */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="font-display text-2xl text-accent font-bold mb-4">APPLY</h2>
            <p className="text-muted-foreground text-sm text-center py-4">
              Artists will see the application form here
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
