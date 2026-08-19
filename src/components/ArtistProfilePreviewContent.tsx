import { useRef } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

export interface PreviewArtistProfile {
  band_name?: string | null;
  genre?: string | null;
  location?: string | null;
  bio?: string | null;
  pictures?: string[] | null;
  featured_samples?: string[] | null;
  past_gigs?: string[] | null;
  press_links?: string[] | null;
  spotify_link?: string | null;
  soundcloud_link?: string | null;
  apple_music_link?: string | null;
  youtube_link?: string | null;
  facebook_link?: string | null;
  tiktok_link?: string | null;
  instagram_link?: string | null;
  bandsintown_link?: string | null;
}

export default function ArtistProfilePreviewContent({ artistProfile }: { artistProfile: PreviewArtistProfile | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  const bandName = artistProfile?.band_name || 'Untitled Artist';
  const pictures = artistProfile?.pictures || [];
  const socialLinks = [
    { key: 'spotify_link', label: 'Spotify', value: artistProfile?.spotify_link },
    { key: 'soundcloud_link', label: 'SoundCloud', value: artistProfile?.soundcloud_link },
    { key: 'apple_music_link', label: 'Apple Music', value: artistProfile?.apple_music_link },
    { key: 'youtube_link', label: 'YouTube', value: artistProfile?.youtube_link },
    { key: 'facebook_link', label: 'Facebook', value: artistProfile?.facebook_link },
    { key: 'tiktok_link', label: 'TikTok', value: artistProfile?.tiktok_link },
    { key: 'instagram_link', label: 'Instagram', value: artistProfile?.instagram_link },
    { key: 'bandsintown_link', label: 'Bandsintown', value: artistProfile?.bandsintown_link },
  ].filter(link => link.value);

  return <div className="w-full max-w-none">
    <h1 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-wide text-primary font-semibold mb-8">
      {bandName}
    </h1>

    {pictures.length > 0 && (
      <div className="relative group mb-8">
        <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {pictures.map((pic, i) => (
            <div key={i} className="flex-none w-[80vw] md:w-[60vw] lg:w-[45vw] max-w-3xl aspect-[4/3] bg-secondary overflow-hidden snap-start">
              <img src={pic} alt={`${bandName} photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        {pictures.length > 1 && <>
          <button onClick={() => scroll('left')} className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={() => scroll('right')} className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>}
      </div>
    )}

    {(artistProfile?.genre || artistProfile?.location) && (
      <div className="bg-card border border-border p-6 md:p-8 grid gap-6 md:grid-cols-2 mb-8">
        {artistProfile?.genre && <div className="space-y-2">
          <h3 className="font-display text-xs text-primary tracking-widest">GENRE</h3>
          <p className="text-foreground text-lg">{artistProfile.genre}</p>
        </div>}
        {artistProfile?.location && <div className="space-y-2">
          <h3 className="font-display text-xs text-primary tracking-widest">BASED IN</h3>
          <p className="text-foreground text-lg">{artistProfile.location}</p>
        </div>}
      </div>
    )}

    {artistProfile?.bio && <div className="bg-card border border-border p-6 md:p-8 mb-8">
      <h2 className="font-display text-sm text-primary tracking-widest mb-4">BIO</h2>
      <p className="whitespace-pre-wrap text-primary text-lg leading-relaxed">{artistProfile.bio}</p>
    </div>}

    {socialLinks.length > 0 && <div className="bg-card border border-border p-6 md:p-8 mb-8">
      <h2 className="font-display text-sm text-primary tracking-widest mb-4">LINKS</h2>
      <div className="flex flex-wrap gap-3">
        {socialLinks.map(link => (
          <a key={link.key} href={link.value!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-base bg-secondary px-4 py-2 hover:bg-secondary/80 transition-colors">
            {link.label}
            <ExternalLink className="h-4 w-4" />
          </a>
        ))}
      </div>
    </div>}

    {artistProfile?.featured_samples && artistProfile.featured_samples.length > 0 && <div className="bg-card border border-border p-6 md:p-8 mb-8">
      <h2 className="font-display text-sm text-primary tracking-widest mb-4">FEATURED SAMPLES</h2>
      <div className="space-y-3">
        {artistProfile.featured_samples.map((sample, i) => <audio key={i} controls className="w-full">
          <source src={sample} />
        </audio>)}
      </div>
    </div>}

    {artistProfile?.past_gigs && artistProfile.past_gigs.length > 0 && <div className="bg-card border border-border p-6 md:p-8 mb-8">
      <h2 className="font-display text-sm text-primary tracking-widest mb-4">PAST GIGS</h2>
      <ul className="space-y-2">
        {artistProfile.past_gigs.map((gig, i) => <li key={i} className="text-base text-primary">{gig}</li>)}
      </ul>
    </div>}

    {artistProfile?.press_links && artistProfile.press_links.length > 0 && <div className="bg-card border border-border p-6 md:p-8">
      <h2 className="font-display text-sm text-primary tracking-widest mb-4">PRESS</h2>
      <ul className="space-y-2">
        {artistProfile.press_links.map((link, i) => <li key={i}>
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-base text-primary hover:underline flex items-center gap-1">
            {link}
            <ExternalLink className="h-4 w-4" />
          </a>
        </li>)}
      </ul>
    </div>}
  </div>;
}
