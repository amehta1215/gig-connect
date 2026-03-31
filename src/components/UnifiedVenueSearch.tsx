import { useState, useEffect, useRef, useMemo } from 'react';
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
  const [externalLocations, setExternalLocations] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Extract unique venue locations from loaded venues
  const venueLocations = useMemo(() => {
    const locMap = new Map<string, string>();
    venues.forEach(v => {
      if (v.location) {
        const key = v.location.toLowerCase();
        if (!locMap.has(key)) locMap.set(key, v.location);
      }
    });
    return Array.from(locMap.values());
  }, [venues]);

  // Matching venue locations from the database (instant, no API call)
  const matchingLocations = useMemo(() => {
    if (query.length < 1) return [];
    const q = query.toLowerCase();
    return venueLocations.filter(loc => loc.toLowerCase().includes(q));
  }, [query, venueLocations]);

  // Matching venues by name
  const matchingVenues = useMemo(() => {
    if (query.length < 2) return [];
    const q = query.toLowerCase();
    return venues.filter(v =>
      v.venue_name.toLowerCase().includes(q) ||
      v.room_name?.toLowerCase().includes(q)
    ).slice(0, 5);
  }, [query, venues]);

  const searchExternalLocations = async (q: string) => {
    if (q.length < 3) {
      setExternalLocations([]);
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mapbox-search', {
        body: { query: q },
      });
      if (error) throw error;
      // Filter out locations already shown from venue locations
      const external = (data.suggestions || []).filter((s: LocationSuggestion) =>
        !matchingLocations.some(loc => loc.toLowerCase() === s.text.toLowerCase())
      );
      setExternalLocations(external);
    } catch (err) {
      console.error('Location search error:', err);
      setExternalLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const hasResults = matchingLocations.length > 0 || matchingVenues.length > 0 || externalLocations.length > 0;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onSearchChange(newValue);

    if (newValue.length >= 1) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setExternalLocations([]);
    }

    // Debounce external location search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchExternalLocations(newValue);
    }, 400);
  };

  const handleLocationSelect = (locationText: string) => {
    setQuery(locationText);
    onLocationSelect(locationText);
    onSearchChange('');
    setIsOpen(false);
    setExternalLocations([]);
  };

  const handleVenueSelect = (venue: VenueSuggestion) => {
    setQuery('');
    onVenueSelect(venue.id);
    setIsOpen(false);
    setExternalLocations([]);
  };

  const handleClear = () => {
    setQuery('');
    onSearchChange('');
    onLocationSelect('');
    setIsOpen(false);
    setExternalLocations([]);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
      <Input
        placeholder="Search venues, neighborhoods, cities..."
        value={query}
        onChange={handleInputChange}
        onFocus={() => query.length >= 1 && hasResults && setIsOpen(true)}
        className="pl-10 bg-card border-border"
      />

      {query.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
        >
          ×
        </button>
      )}

      {isOpen && hasResults && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-50 max-h-72 overflow-y-auto">
          {/* Venue name matches */}
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
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Venue locations from DB (instant) */}
          {matchingLocations.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-b border-border">
                Locations
              </div>
              {matchingLocations.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => handleLocationSelect(loc)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-secondary transition-colors flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate text-foreground">{loc}</span>
                </button>
              ))}
            </div>
          )}

          {/* External location suggestions (from Nominatim) */}
          {externalLocations.length > 0 && (
            <div>
              {matchingLocations.length === 0 && (
                <div className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest text-muted-foreground border-b border-border">
                  Locations
                </div>
              )}
              {externalLocations.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleLocationSelect(s.text)}
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
        <div className="absolute right-8 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
