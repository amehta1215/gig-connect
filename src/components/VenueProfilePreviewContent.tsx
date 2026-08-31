import { ReactNode, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Music, Users } from 'lucide-react';
import VenueShareLink from '@/components/VenueShareLink';

export interface PreviewVenueListing {
  id: string;
  venue_name: string;
  room_name: string | null;
  location?: string | null;
  slug?: string | null;
  capacity: number | null;
  genres?: string[] | null;
  pictures?: string[] | null;
}

export interface PreviewVenueProfile {
  id: string;
  picture?: string | null;
  pictures?: string[] | null;
  genres?: string[] | null;
  bio?: string | null;
  venue_name?: string | null;
  location?: string | null;
}

interface Props {
  venueProfile: PreviewVenueProfile | null;
  listings: PreviewVenueListing[];
  /** Optional apply panel etc. rendered in the right column (omitted in read-only previews) */
  sidebar?: ReactNode;
  onRoomClick?: (room: PreviewVenueListing) => void;
  headerAction?: ReactNode;
}

export default function VenueProfilePreviewContent({
  venueProfile,
  listings,
  sidebar,
  onRoomClick,
  headerAction,
}: Props) {
  const galleryScrollRef = useRef<HTMLDivElement>(null);

  const shared = listings[0];
  const venueName = shared?.venue_name || venueProfile?.venue_name || 'Your Venue';
  const location = shared?.location || venueProfile?.location || null;

  const venuePics = (venueProfile?.pictures && venueProfile.pictures.length > 0)
    ? venueProfile.pictures
    : (venueProfile?.picture ? [venueProfile.picture] : []);
  const galleryPictures = Array.from(new Set([
    ...venuePics,
    ...listings.flatMap(l => l.pictures || []),
  ]));

  const scroll = (dir: 'left' | 'right') => {
    if (!galleryScrollRef.current) return;
    const container = galleryScrollRef.current;
    const card = container.children[0] as HTMLElement;
    const cardWidth = card?.offsetWidth || 400;
    container.scrollBy({ left: dir === 'left' ? -cardWidth - 16 : cardWidth + 16, behavior: 'smooth' });
  };

  return <div className="w-full max-w-none">
    {headerAction && <div className="flex items-center justify-end mb-6">{headerAction}</div>}

    <div className="mb-8">
      {galleryPictures.length === 0 ? (
        <div className="aspect-[4/3] w-full max-w-xl bg-secondary rounded-lg overflow-hidden">
          <div className="w-full h-full flex items-center justify-center bg-heat">
            <Music className="h-16 w-16 text-primary/30" />
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div ref={galleryScrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth">
            {galleryPictures.map((pic, i) => (
              <div key={i} className="flex-shrink-0 w-[80vw] md:w-[60vw] lg:w-[45vw] max-w-3xl aspect-[4/3] bg-secondary rounded-lg overflow-hidden">
                <img src={pic} alt={`${venueName} ${i + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
          {galleryPictures.length > 1 && <>
            <button onClick={(e) => { e.stopPropagation(); scroll('left'); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <ChevronLeft className="h-6 w-6 text-foreground" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); scroll('right'); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <ChevronRight className="h-6 w-6 text-foreground" />
            </button>
          </>}
        </div>
      )}
    </div>

    <div className="space-y-4 mb-4">
      <h1 className="font-display text-5xl md:text-6xl lg:text-7xl text-black font-bold tracking-wide">
        {venueName}
      </h1>
      {location && (
        <div className="flex items-center gap-2 text-primary text-lg">
          <MapPin className="h-5 w-5" />
          {location}
        </div>
      )}
    </div>
    {venueProfile?.genres && venueProfile.genres.length > 0 && (
      <div className="flex flex-wrap gap-2 mb-10">
        {venueProfile.genres.map(genre => (
          <span key={genre} className="text-sm px-4 py-1.5 uppercase tracking-wider font-display bg-gray-200">
            {genre.toLowerCase() === 'all' ? 'All Genres' : genre}
          </span>
        ))}
      </div>
    )}

    <div className="flex flex-col lg:flex-row gap-10">
      <div className="flex-1 order-2 lg:order-1">
        <div className="space-y-4">
          {venueProfile?.bio && (
            <div className="bg-card border border-border rounded-lg p-6 md:p-8">
              <h3 className="font-display text-sm text-primary tracking-widest mb-3">BIO</h3>
              <p className="text-base text-primary whitespace-pre-line leading-relaxed">{venueProfile.bio}</p>
              <div className="mt-5">
                <VenueShareLink slug={venueProfile.slug} />
              </div>
            </div>
          )}
        </div>
        <div className="mt-12">
          <h2 className="font-display text-3xl text-black font-bold tracking-wide mb-6">ROOMS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map(room => (
              <div
                key={room.id}
                onClick={onRoomClick ? () => onRoomClick(room) : undefined}
                className={`group bg-card border border-border overflow-hidden transition-all relative ${onRoomClick ? 'hover:border-primary cursor-pointer' : ''}`}
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
                    <div className="absolute top-3 left-3 bg-background/90 px-2.5 py-1 text-xs font-display tracking-wider flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {room.capacity}
                    </div>
                  )}
                </div>
                <div className="p-4">
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

      {sidebar && (
        <div className="lg:w-80 xl:w-96 order-1 lg:order-2">
          <div className="lg:sticky lg:top-4">{sidebar}</div>
        </div>
      )}
    </div>
  </div>;
}
