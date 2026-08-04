import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Users, Music, ChevronLeft, ChevronRight } from 'lucide-react';

interface RoomPreviewData {
  venue_name: string;
  room_name: string;
  location: string;
  capacity: string;
  genres: string[];
  bio: string;
  backline_info: string;
  house_rules: string;
  pictures: string[];
}

interface RoomPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RoomPreviewData;
}

export function RoomPreviewSheet({ open, onOpenChange, data }: RoomPreviewSheetProps) {
  const galleryScrollRef = useRef<HTMLDivElement>(null);
  const allPictures: string[] = data.pictures || [];

  const scroll = (dir: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const card = container.children[0] as HTMLElement;
    const cardWidth = card?.offsetWidth || 300;
    container.scrollBy({ left: dir === 'left' ? -cardWidth - 8 : cardWidth + 8, behavior: 'smooth' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="animate-fade-in pt-4">
          {/* Pictures Gallery - horizontal carousel */}
          <div className="mb-6">
            {allPictures.length === 0 ? (
              <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
                <div className="w-full h-full flex items-center justify-center bg-heat">
                  <Music className="h-12 w-12 text-primary/30" />
                </div>
              </div>
            ) : (
              <div className="relative group">
                <div
                  ref={galleryScrollRef}
                  className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth"
                >
                  {allPictures.map((pic, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden"
                    >
                      <img
                        src={pic}
                        alt={`${data.venue_name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                {allPictures.length > 3 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); scroll('left'); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ChevronLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); scroll('right'); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ChevronRight className="h-5 w-5 text-foreground" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Venue Info */}
          <div className="space-y-4 mb-8">
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wide text-primary font-semibold">
                {data.venue_name || 'Venue Name'}
              </h1>
              {data.room_name && (
                <p className="text-lg mt-1 text-primary">{data.room_name}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {data.location && (
                <span className="flex items-center gap-2 text-primary">
                  <MapPin className="h-4 w-4" />
                  {data.location}
                </span>
              )}
              {data.capacity && (
                <span className="flex items-center gap-2 text-primary">
                  <Users className="h-4 w-4" />
                  {data.capacity} capacity
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {data.backline_info && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
                <p className="text-sm text-primary whitespace-pre-line">{data.backline_info}</p>
              </div>
            )}
            {data.house_rules && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
                <p className="text-sm text-primary whitespace-pre-line">{data.house_rules}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
