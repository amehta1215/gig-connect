import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Search, MapPin, Music } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LocationSuggestion {
  id: string;
  name: string;
  text: string;
}

interface VenueSuggestion {
  id: string;
  venue_name: string;
  room_name: string | null;
  location: string | null;
}

interface UnifiedVenueSearchProps {
  onLocationSelect: (location: string) => void;
  onVenueSelect: (venueId: string) => void;
  onSearchChange: (term: string) => void;
  venues: VenueSuggestion[];
  className?: string;
}

export function UnifiedVenueSearch({
  onLocationSelect,
  onVenueSelect,
  onSearchChange,
  venues,
  className = "",
}: UnifiedVenueSearchProps) {
  const [query, setQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (q: string) => {
    if (q.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mapbox-search', {
        body: { query: q },
      });
      if (error) throw error;
      setLocationSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Location search error:', err);
      setLocationSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const matchingVenues = query.length >= 2
    ? venues.filter(v =>
        v.venue_name.toLowerCase().includes(query.toLowerCase()) ||
        v.room_name?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  const hasResults = locationSuggestions.length > 0 || matchingVenues.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onSearchChange(newValue);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchLocations(newValue);
      if (newValue.length >= 2) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    }, 300);
  };

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.text);
    onLocationSelect(suggestion.text);
    onSearchChange('');
    setIsOpen(false);
    setLocationSuggestions([]);
  };

  const handleVenueSelect = (venue: VenueSuggestion) => {
    setQuery('');
    onVenueSelect(venue.id);
    setIsOpen(false);
    setLocationSuggestions([]);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        placeholder="Search venues, neighborhoods, cities..."
        value={query}
        onChange={handleInputChange}
        onFocus={() => hasResults && query.length >= 2 && setIsOpen(true)}
        className="pl-10 bg-card border-border"
      />

      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-72 overflow-y-auto">
          {/* Venue matches */}
          {matchingVenues.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-b border-border">
                Venues
              </div>
              {matchingVenues.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => handleVenueSelect(v)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <Music className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="truncate">
                    <span className="text-foreground">{v.venue_name}</span>
                    {v.room_name && (
                      <span className="text-muted-foreground"> · {v.room_name}</span>
                    )}
                    {v.location && (
                      <span className="text-muted-foreground text-xs ml-2">— {v.location}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Location matches */}
          {locationSuggestions.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-b border-border">
                Locations
              </div>
              {locationSuggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleLocationSelect(s)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{s.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
