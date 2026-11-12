import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VenueCardGalleryProps {
  venueName: string;
  pictures?: string[] | null;
  picture?: string | null;
}

export function VenueCardGallery({ venueName, pictures, picture }: VenueCardGalleryProps) {
  const photos = Array.from(new Set(pictures?.length ? pictures : picture ? [picture] : []));
  const [carouselRef, carousel] = useEmblaCarousel({ loop: true, watchDrag: photos.length > 1 });
  const arrowClassName = 'absolute top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 hover:bg-background text-foreground hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity z-10';

  if (photos.length === 0) {
    return <div className="absolute inset-0 flex items-center justify-center bg-heat">
      <Music className="h-12 w-12 text-primary/30" />
    </div>;
  }

  return <div role="region" aria-roledescription="carousel" aria-label={`${venueName} photos`} className="relative h-full">
    <div ref={carouselRef} className="h-full overflow-hidden touch-pan-y">
      <div className="flex h-full">
        {photos.map((photo, index) => <div key={photo} role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${photos.length}`} className="min-w-0 flex-[0_0_100%] h-full">
          <img src={photo} alt={`${venueName} ${index + 1}`} draggable={false} loading="lazy" className="w-full h-full object-cover" />
        </div>)}
      </div>
    </div>
    {photos.length > 1 && <>
      <Button type="button" variant="ghost" size="icon" aria-label={`Previous photo of ${venueName}`} title="Previous photo" className={`${arrowClassName} left-2`} onClick={event => {
        event.stopPropagation();
        carousel?.scrollPrev();
      }}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={`Next photo of ${venueName}`} title="Next photo" className={`${arrowClassName} right-2`} onClick={event => {
        event.stopPropagation();
        carousel?.scrollNext();
      }}>
        <ChevronRight className="h-5 w-5" />
      </Button>
    </>}
  </div>;
}