import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, MapPin, Calendar as CalendarIcon, Music, Plus, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Opener {
  type: 'riff' | 'external';
  artist_id?: string;
  name: string;
  band_name?: string;
}

interface GigData {
  id: string;
  gig_date: string;
  notes: string | null;
  openers: Opener[];
  venue_listing_id: string;
  artist_id: string;
}

interface VenueListing {
  venue_name: string;
  room_name: string | null;
  location: string | null;
}

interface ArtistProfile {
  band_name: string | null;
  genre: string | null;
  pictures: string[] | null;
}

interface ArtistSearchResult {
  user_id: string;
  band_name: string | null;
  genre: string | null;
}

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [gig, setGig] = useState<GigData | null>(null);
  const [venueListing, setVenueListing] = useState<VenueListing | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [artistName, setArtistName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Opener form state
  const [openers, setOpeners] = useState<Opener[]>([]);
  const [notes, setNotes] = useState('');
  const [showOpenerSearch, setShowOpenerSearch] = useState(false);
  const [openerSearchQuery, setOpenerSearchQuery] = useState('');
  const [artistSearchResults, setArtistSearchResults] = useState<ArtistSearchResult[]>([]);
  const [externalOpenerName, setExternalOpenerName] = useState('');

  useEffect(() => {
    if (id && user) {
      fetchGig();
    }
  }, [id, user]);

  const fetchGig = async () => {
    setLoading(true);

    const { data: gigData, error } = await supabase
      .from('gig_listings')
      .select('*')
      .eq('id', id)
      .single();

    if (!gigData || error) {
      setLoading(false);
      return;
    }

    const parsedOpeners = Array.isArray(gigData.openers) 
      ? (gigData.openers as unknown as Opener[]) 
      : [];
    setGig({ ...gigData, openers: parsedOpeners } as unknown as GigData);
    setOpeners(parsedOpeners);
    setNotes(gigData.notes || '');

    // Fetch venue listing
    const { data: venueData } = await supabase
      .from('venue_listings')
      .select('venue_name, room_name, location')
      .eq('id', gigData.venue_listing_id)
      .single();

    if (venueData) {
      setVenueListing(venueData);
    }

    // Fetch artist profile
    const { data: artistData } = await supabase
      .from('artist_profiles')
      .select('band_name, genre, pictures')
      .eq('user_id', gigData.artist_id)
      .single();

    if (artistData) {
      setArtistProfile(artistData);
    }

    // Fetch artist name from profiles
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', gigData.artist_id)
      .single();

    if (profileData) {
      setArtistName(artistData?.band_name || `${profileData.first_name} ${profileData.last_name}`);
    }

    setLoading(false);
  };

  const searchArtists = async (query: string) => {
    if (!query.trim()) {
      setArtistSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('artist_profiles')
      .select('user_id, band_name, genre')
      .ilike('band_name', `%${query}%`)
      .limit(5);

    if (data) {
      setArtistSearchResults(data);
    }
  };

  const addRiffOpener = (artist: ArtistSearchResult) => {
    if (openers.some(o => o.artist_id === artist.user_id)) {
      toast.error('Artist already added');
      return;
    }

    setOpeners([...openers, {
      type: 'riff',
      artist_id: artist.user_id,
      name: artist.band_name || 'Unknown Artist',
      band_name: artist.band_name || undefined,
    }]);
    setShowOpenerSearch(false);
    setOpenerSearchQuery('');
    setArtistSearchResults([]);
  };

  const addExternalOpener = () => {
    if (!externalOpenerName.trim()) return;

    setOpeners([...openers, {
      type: 'external',
      name: externalOpenerName.trim(),
    }]);
    setExternalOpenerName('');
    setShowOpenerSearch(false);
  };

  const removeOpener = (index: number) => {
    setOpeners(openers.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!gig) return;
    
    setSaving(true);

    const { error } = await supabase
      .from('gig_listings')
      .update({
        openers: JSON.parse(JSON.stringify(openers)),
        notes: notes.trim() || null,
      })
      .eq('id', gig.id);

    setSaving(false);

    if (error) {
      toast.error('Failed to save changes');
      return;
    }

    toast.success('Gig updated!');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card animate-pulse" />
        <div className="h-96 bg-card animate-pulse" />
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="text-center py-20">
        <h3 className="font-display text-2xl text-muted-foreground">GIG NOT FOUND</h3>
        <Button onClick={() => navigate('/venue/calendar')} variant="outline" className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Back Button */}
      <Button variant="ghost" size="icon" onClick={() => navigate('/venue/calendar')}>
        <ArrowLeft className="h-5 w-5" />
      </Button>

      {/* Gig Flyer Style Card */}
      <div className="bg-card border-4 border-accent p-8 space-y-6">
        {/* Header Image */}
        {artistProfile?.pictures && artistProfile.pictures.length > 0 && (
          <div className="aspect-video bg-secondary overflow-hidden -mx-8 -mt-8 mb-6">
            <img 
              src={artistProfile.pictures[0]} 
              alt={artistName}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Date */}
        <div className="text-center">
          <p className="font-display text-sm text-primary tracking-widest">
            {format(new Date(gig.gig_date), 'EEEE').toUpperCase()}
          </p>
          <p className="font-display text-5xl md:text-6xl text-accent font-bold">
            {format(new Date(gig.gig_date), 'MMMM d').toUpperCase()}
          </p>
          <p className="font-display text-2xl text-muted-foreground">
            {format(new Date(gig.gig_date), 'yyyy')}
          </p>
        </div>

        {/* Headliner */}
        <div className="text-center border-y-2 border-border py-6">
          <p className="font-display text-xs text-primary tracking-widest mb-2">HEADLINER</p>
          <h1 className="font-display text-4xl md:text-5xl text-accent font-bold tracking-wide">
            {artistName.toUpperCase()}
          </h1>
        </div>

        {/* Openers Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-display text-xs text-primary tracking-widest">OPENERS</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowOpenerSearch(true)}
              className="text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Opener
            </Button>
          </div>

          {openers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4 border border-dashed border-border">
              No openers added yet
            </p>
          ) : (
            <div className="space-y-2">
              {openers.map((opener, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between bg-secondary px-4 py-2"
                >
                  <div>
                    <p className="font-display text-lg text-accent">{opener.name}</p>
                    {opener.type === 'riff' && (
                      <p className="text-xs text-primary">RIFF Artist</p>
                    )}
                  </div>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => removeOpener(index)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Opener Search/Add UI */}
          {showOpenerSearch && (
            <div className="bg-secondary p-4 space-y-4">
              <p className="font-display text-xs text-primary tracking-widest">SEARCH RIFF ARTISTS</p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={openerSearchQuery}
                  onChange={(e) => {
                    setOpenerSearchQuery(e.target.value);
                    searchArtists(e.target.value);
                  }}
                  placeholder="Search by band name..."
                  className="pl-10 bg-background"
                />
              </div>
              {artistSearchResults.length > 0 && (
                <div className="space-y-1">
                  {artistSearchResults.map(artist => (
                    <button
                      key={artist.user_id}
                      onClick={() => addRiffOpener(artist)}
                      className="w-full text-left px-3 py-2 hover:bg-background transition-colors"
                    >
                      <p className="font-display text-accent">{artist.band_name || 'Unknown'}</p>
                      {artist.genre && (
                        <p className="text-xs text-muted-foreground">{artist.genre}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="border-t border-border pt-4">
                <p className="font-display text-xs text-primary tracking-widest mb-2">OR ADD EXTERNAL ARTIST</p>
                <div className="flex gap-2">
                  <Input
                    value={externalOpenerName}
                    onChange={(e) => setExternalOpenerName(e.target.value)}
                    placeholder="Artist name"
                    className="bg-background"
                  />
                  <Button onClick={addExternalOpener} disabled={!externalOpenerName.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowOpenerSearch(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Venue Info */}
        <div className="text-center border-t-2 border-border pt-6">
          <p className="font-display text-2xl text-foreground">
            {venueListing?.room_name 
              ? `${venueListing.room_name} at ${venueListing.venue_name}`
              : venueListing?.venue_name}
          </p>
          {venueListing?.location && (
            <p className="text-muted-foreground mt-2">
              {venueListing.location}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <p className="font-display text-xs text-primary tracking-widest">NOTES</p>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional notes about this show..."
            className="bg-background border-border min-h-[100px]"
          />
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
