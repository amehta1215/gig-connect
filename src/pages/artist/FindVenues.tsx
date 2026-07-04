import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Music, Filter, X, Heart } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UnifiedVenueSearch } from '@/components/UnifiedVenueSearch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
interface VenueListing {
  id: string;
  venue_name: string;
  room_name: string | null;
  location: string | null;
  capacity: number | null;
  genres: string[];
  pictures: string[];
  bio: string | null;
  venue_profile_id: string;
}
interface VenueProfile {
  id: string;
  picture: string | null;
}
const genres = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];
const capacityRanges = [{
  label: '<100',
  value: '0-100',
  min: 0,
  max: 100
}, {
  label: '100-300',
  value: '100-300',
  min: 100,
  max: 300
}, {
  label: '300-500',
  value: '300-500',
  min: 300,
  max: 500
}, {
  label: '500+',
  value: '500+',
  min: 500,
  max: Infinity
}];
export default function FindVenues() {
  const navigate = useNavigate();
  const {
    toggleFavorite,
    isFavorite
  } = useFavorites();
  const [venues, setVenues] = useState<VenueListing[]>([]);
  const [venueProfiles, setVenueProfiles] = useState<Record<string, VenueProfile>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCapacities, setSelectedCapacities] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const handleToggleFavorite = async (e: React.MouseEvent, venueId: string) => {
    e.stopPropagation();
    await toggleFavorite(venueId);
  };
  useEffect(() => {
    fetchVenues();
  }, []);
  const fetchVenues = async () => {
    setLoading(true);

    // Fetch venues
    const {
      data: venuesData,
      error: venuesError
    } = await supabase.from('venue_listings').select('*');
    if (venuesData && !venuesError) {
      setVenues(venuesData as VenueListing[]);

      // Get unique venue profile IDs
      const profileIds = [...new Set(venuesData.map(v => v.venue_profile_id))];

      // Fetch venue profiles for pictures
      if (profileIds.length > 0) {
        const {
          data: profilesData
        } = await supabase.from('venue_profiles').select('id, picture').in('id', profileIds);
        if (profilesData) {
          const profilesMap: Record<string, VenueProfile> = {};
          profilesData.forEach(p => {
            profilesMap[p.id] = p as VenueProfile;
          });
          setVenueProfiles(profilesMap);
        }
      }
    }
    setLoading(false);
  };
  // Count rooms per venue profile to determine if room name should be shown
  const roomCountByVenueProfile = venues.reduce((acc, venue) => {
    acc[venue.venue_profile_id] = (acc[venue.venue_profile_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const filteredVenues = venues.filter(venue => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || venue.venue_name.toLowerCase().includes(q) || venue.room_name?.toLowerCase().includes(q) || venue.location?.toLowerCase().includes(q);
    const matchesGenre = selectedGenres.length === 0 || selectedGenres.some(g => venue.genres?.includes(g));
    const matchesLocation = !selectedLocation || (() => {
      const venueLoc = venue.location?.toLowerCase() || '';
      const searchLoc = selectedLocation.toLowerCase();
      // Match if either contains the other (handles "New York" matching "New York, New York")
      return venueLoc.includes(searchLoc) || searchLoc.includes(venueLoc);
    })();
    let matchesCapacity = true;
    if (selectedCapacities.length > 0 && venue.capacity) {
      matchesCapacity = selectedCapacities.some(cap => {
        const range = capacityRanges.find(r => r.value === cap);
        if (!range) return false;
        return venue.capacity! >= range.min && venue.capacity! <= range.max;
      });
    }
    return matchesSearch && matchesGenre && matchesLocation && matchesCapacity;
  });
  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);
  };
  const toggleCapacity = (capacity: string) => {
    setSelectedCapacities(prev => prev.includes(capacity) ? prev.filter(c => c !== capacity) : [...prev, capacity]);
  };
  const hasActiveFilters = selectedGenres.length > 0 || selectedCapacities.length > 0 || selectedLocation !== '' || searchTerm !== '';
  const clearAllFilters = () => {
    setSelectedGenres([]);
    setSelectedCapacities([]);
    setSelectedLocation('');
    setSearchTerm('');
  };
  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    setSearchTerm('');
  };
  const handleVenueSelect = (venueProfileId: string) => {
    navigate(`/artist/venue/${venueProfileId}`);
  };
  // Deduplicate by venue_profile_id so each venue appears once
  const uniqueVenues = (() => {
    const seen = new Set<string>();
    const result: VenueListing[] = [];
    for (const v of filteredVenues) {
      if (seen.has(v.venue_profile_id)) continue;
      seen.add(v.venue_profile_id);
      result.push(v);
    }
    return result;
  })();
  // Capacity range per venue_profile_id (uses all listings, not just filtered)
  const capacityRangeByVenue = venues.reduce((acc, v) => {
    if (v.capacity == null) return acc;
    const cur = acc[v.venue_profile_id];
    if (!cur) acc[v.venue_profile_id] = { min: v.capacity, max: v.capacity };
    else {
      cur.min = Math.min(cur.min, v.capacity);
      cur.max = Math.max(cur.max, v.capacity);
    }
    return acc;
  }, {} as Record<string, { min: number; max: number }>);
  const genreMultiSelect = (className?: string) => <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`bg-card border-border justify-start text-muted-foreground ${className || ''}`}>
          <Music className="h-4 w-4 mr-2" />
          {selectedGenres.length === 0 ? 'Genre' : `${selectedGenres.length} selected`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          {selectedGenres.length > 0 && <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={() => setSelectedGenres([])}>
              <X className="h-3 w-3 mr-1" /> Clear all
            </Button>}
          {genres.map(genre => <label key={genre} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-1.5 rounded">
              <Checkbox checked={selectedGenres.includes(genre)} onCheckedChange={() => toggleGenre(genre)} />
              <span className="text-sm">{genre}</span>
            </label>)}
        </div>
      </PopoverContent>
    </Popover>;
  const capacityMultiSelect = (className?: string) => <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={`bg-card border-border justify-start text-muted-foreground ${className || ''}`}>
          <Users className="h-4 w-4 mr-2" />
          {selectedCapacities.length === 0 ? 'Capacity' : `${selectedCapacities.length} selected`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        <div className="space-y-2">
          {selectedCapacities.length > 0 && <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground" onClick={() => setSelectedCapacities([])}>
              <X className="h-3 w-3 mr-1" /> Clear all
            </Button>}
          {capacityRanges.map(range => <label key={range.value} className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-1.5 rounded">
              <Checkbox checked={selectedCapacities.includes(range.value)} onCheckedChange={() => toggleCapacity(range.value)} />
              <span className="text-sm">{range.label}</span>
            </label>)}
        </div>
      </PopoverContent>
    </Popover>;
  const filtersContent = <div className="space-y-4">
      {genreMultiSelect("w-full")}
      {capacityMultiSelect("w-full")}
    </div>;
  return <div className="space-y-6 animate-fade-in">
      {/* Header */}
      

      {/* Search and Filters */}
      <Collapsible open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <div className="flex gap-2">
          <div className="flex-1">
            <UnifiedVenueSearch onLocationSelect={handleLocationSelect} onVenueSelect={handleVenueSelect} onSearchChange={setSearchTerm} venues={venues} className="w-full" />
          </div>

          {/* Desktop Filters */}
          <div className="hidden lg:flex gap-2">
            {genreMultiSelect("w-36")}
            {capacityMultiSelect("w-36")}
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3 mr-1" /> Reset
              </Button>}
          </div>

          {/* Mobile Filter Toggle */}
          <CollapsibleTrigger asChild className="lg:hidden">
            <Button variant="outline" size="icon" className={`border-border ${mobileFiltersOpen ? 'bg-primary text-primary-foreground' : ''}`}>
              {mobileFiltersOpen ? <X className="h-4 w-4" /> : <Filter className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        {/* Mobile Filters - opens below search bar */}
        <CollapsibleContent className="lg:hidden">
          <div className="mt-3 p-4 bg-card border border-border space-y-4">
            {filtersContent}
            {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearAllFilters} className="w-full text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3 mr-1" /> Reset All Filters
              </Button>}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Results */}
      {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-card h-56 animate-pulse" />)}
        </div> : uniqueVenues.length === 0 ? <div className="text-center py-20">
          <h3 className="font-display text-2xl text-muted-foreground">NO VENUES</h3>
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {uniqueVenues.map(venue => <div key={venue.venue_profile_id} onClick={() => navigate(`/artist/venue/${venue.venue_profile_id}`)} className="group bg-card border border-border overflow-hidden transition-all hover:border-primary cursor-pointer relative">
              {/* Favorite Button */}
              <button onClick={e => handleToggleFavorite(e, venue.id)} className="absolute top-2 right-2 z-10 p-1.5 bg-background/80 rounded-full hover:bg-background transition-colors">
                <Heart className={`h-5 w-5 transition-colors ${isFavorite(venue.id) ? 'fill-[#E8556D] text-[#E8556D]' : 'text-muted-foreground hover:text-[#E8556D]'}`} />
              </button>

              {/* Image - prioritize venue profile picture, fallback to room picture */}
              <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                {(() => {
            const venueProfile = venueProfiles[venue.venue_profile_id];
            const displayPicture = venueProfile?.picture || null;
            return displayPicture ? <img src={displayPicture} alt={venue.venue_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="absolute inset-0 flex items-center justify-center bg-heat">
                      <Music className="h-12 w-12 text-primary/30" />
                    </div>;
          })()}
                {/* Capacity badge */}
                {(() => {
                  const range = capacityRangeByVenue[venue.venue_profile_id];
                  if (!range) return null;
                  const label = range.min === range.max ? `${range.min}` : `${range.min}–${range.max}`;
                  return <div className="absolute top-2 left-2 bg-background/90 px-2 py-0.5 text-xs font-display tracking-wider flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {label}
                  </div>;
                })()}
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors tracking-wide font-semibold">
                  {venue.venue_name}
                </h3>
                {venue.location && <p className="text-xs flex items-center gap-1 mt-1 text-primary">
                    <MapPin className="h-3 w-3" />
                    {venue.location}
                  </p>}
                {venue.genres && venue.genres.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                    {venue.genres.slice(0, 2).map(genre => <span key={genre} className="text-[10px] px-2 py-0.5 uppercase tracking-wider text-primary bg-gray-200">
                        {genre.toLowerCase() === 'all' ? 'All Genres' : genre}
                      </span>)}
                  </div>}
              </div>
            </div>)}
        </div>}
    </div>;
}