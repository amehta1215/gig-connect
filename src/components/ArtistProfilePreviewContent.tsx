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
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
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

  return <div className="space-y-6">
    <h1 className="font-display text-4xl md:text-5xl tracking-wide text-primary font-semibold">
      {bandName}
    </h1>

    {pictures.length > 0 && (
      <div className="relative group">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory">
          {pictures.map((pic, i) => (
            <div key={i} className="flex-none w-64 aspect-[4/3] bg-secondary overflow-hidden snap-start">
              <img src={pic} alt={`${bandName} photo ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
        {pictures.length > 3 && <>
          <button onClick={() => scroll('left')} className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button onClick={() => scroll('right')} className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight className="h-5 w-5" />
          </button>
        </>}
      </div>
    )}

    {(artistProfile?.genre || artistProfile?.location) && (
      <div className="bg-card border border-border p-6 grid gap-4 md:grid-cols-2">
        {artistProfile?.genre && <div className="space-y-1">
          <h3 className="font-display text-xs text-primary tracking-widest">GENRE</h3>
          <p className="text-foreground">{artistProfile.genre}</p>
        </div>}
        {artistProfile?.location && <div className="space-y-1">
          <h3 className="font-display text-xs text-primary tracking-widest">BASED IN</h3>
          <p className="text-foreground">{artistProfile.location}</p>
        </div>}
      </div>
    )}

    {artistProfile?.bio && <div className="bg-card border border-border p-6">
      <h2 className="font-display text-sm text-primary tracking-widest mb-3">BIO</h2>
      <p className="whitespace-pre-wrap text-primary">{artistProfile.bio}</p>
    </div>}

    {socialLinks.length > 0 && <div className="bg-card border border-border p-6">
      <h2 className="font-display text-sm text-primary tracking-widest mb-3">LINKS</h2>
      <div className="flex flex-wrap gap-2">
        {socialLinks.map(link => (
          <a key={link.key} href={link.value!} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm bg-secondary px-3 py-1.5 hover:bg-secondary/80 transition-colors">
            {link.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>}

    {artistProfile?.featured_samples && artistProfile.featured_samples.length > 0 && <div className="bg-card border border-border p-6">
      <h2 className="font-display text-sm text-primary tracking-widest mb-3">FEATURED SAMPLES</h2>
      <div className="space-y-2">
        {artistProfile.featured_samples.map((sample, i) => <audio key={i} controls className="w-full">
          <source src={sample} />
        </audio>)}
      </div>
    </div>}

    {artistProfile?.past_gigs && artistProfile.past_gigs.length > 0 && <div className="bg-card border border-border p-6">
      <h2 className="font-display text-sm text-primary tracking-widest mb-3">PAST GIGS</h2>
      <ul className="space-y-1">
        {artistProfile.past_gigs.map((gig, i) => <li key={i} className="text-sm text-primary">{gig}</li>)}
      </ul>
    </div>}

    {artistProfile?.press_links && artistProfile.press_links.length > 0 && <div className="bg-card border border-border p-6">
      <h2 className="font-display text-sm text-primary tracking-widest mb-3">PRESS</h2>
      <ul className="space-y-1">
        {artistProfile.press_links.map((link, i) => <li key={i}>
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1">
            {link}
            <ExternalLink className="h-3 w-3" />
          </a>
        </li>)}
      </ul>
    </div>}
  </div>;
}