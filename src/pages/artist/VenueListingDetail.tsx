import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

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

export default function VenueListingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<VenueListing | null>(null);
  const [loading, setLoading] = useState(true);
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) fetchListing();
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
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) navigate(-1); }}>
        <DialogContent className="max-w-5xl h-[90vh] overflow-y-auto">
          <div className="space-y-6 animate-fade-in">
            <div className="h-64 bg-card animate-pulse rounded-lg" />
            <div className="h-8 w-48 bg-card animate-pulse rounded" />
            <div className="h-32 bg-card animate-pulse rounded-lg" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!listing) {
    return (
      <Dialog open onOpenChange={(o) => { if (!o) navigate(-1); }}>
        <DialogContent className="max-w-md">
          <div className="text-center py-8">
            <h3 className="font-display text-2xl text-muted-foreground">ROOM NOT FOUND</h3>
            <Button onClick={() => navigate(-1)} variant="outline" className="mt-4">
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const scroll = (dir: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const card = container.children[0] as HTMLElement;
    const cardWidth = card?.offsetWidth || 300;
    container.scrollBy({ left: dir === 'left' ? -cardWidth - 8 : cardWidth + 8, behavior: 'smooth' });
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) navigate(-1); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="animate-fade-in">
          {/* Pictures Gallery */}
          <div className="mb-6">
            {(() => {
              const allPictures: string[] = listing.pictures || [];
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
                <div className="relative group">
                  <div ref={galleryScrollRef} className="flex gap-2 overflow-x-auto scrollbar-hide scroll-smooth">
                    {allPictures.map((pic, index) => (
                      <div key={index} className="flex-shrink-0 w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                        <img src={pic} alt={`${listing.venue_name} ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  {allPictures.length > 3 && (
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
              );
            })()}
          </div>

          {/* Venue Info */}
          <div className="space-y-4 mb-8">
            <div>
              <h1 className="font-display text-4xl md:text-5xl tracking-wide text-primary font-semibold">
                {listing.venue_name}
              </h1>
              {listing.room_name && <p className="text-lg mt-1 text-primary">{listing.room_name}</p>}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {listing.location && (
                <span className="flex items-center gap-2 text-primary">
                  <MapPin className="h-4 w-4" />
                  {listing.location}
                </span>
              )}
              {listing.capacity && (
                <span className="flex items-center gap-2 text-primary">
                  <Users className="h-4 w-4" />
                  {listing.capacity} capacity
                </span>
              )}
            </div>

          </div>

          {/* About */}
          {listing.bio && (
            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-display text-sm text-primary tracking-widest mb-2">ABOUT</h3>
              <p className="text-sm text-primary whitespace-pre-line">{listing.bio}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
