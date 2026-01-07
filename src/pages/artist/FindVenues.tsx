import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, Users, Music, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
interface VenueListing {
  id: string;
  venue_name: string;
  room_name: string | null;
  location: string | null;
  capacity: number | null;
  genres: string[];
  pictures: string[];
  bio: string | null;
}

const genres = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];
const capacityRanges = [
  { label: 'Any', value: 'any' },
  { label: '<100', value: '0-100' },
  { label: '100-300', value: '100-300' },
  { label: '300-500', value: '300-500' },
  { label: '500+', value: '500+' },
];

export default function FindVenues() {
  const [venues, setVenues] = useState<VenueListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('any');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('venue_listings')
      .select('*');

    if (data && !error) {
      setVenues(data as VenueListing[]);
    }
    setLoading(false);
  };

  const filteredVenues = venues.filter((venue) => {
    const matchesSearch = venue.venue_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (venue.room_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGenre = selectedGenre === 'all' || venue.genres?.includes(selectedGenre);
    
    const matchesLocation = !selectedLocation || 
      venue.location?.toLowerCase().includes(selectedLocation.toLowerCase());

    let matchesCapacity = true;
    if (selectedCapacity !== 'any' && venue.capacity) {
      const [min, max] = selectedCapacity.split('-').map(Number);
      if (selectedCapacity === '500+') {
        matchesCapacity = venue.capacity >= 500;
      } else {
        matchesCapacity = venue.capacity >= min && venue.capacity <= max;
      }
    }

    return matchesSearch && matchesGenre && matchesLocation && matchesCapacity;
  });

  const FiltersContent = () => (
    <div className="space-y-4">
      <LocationAutocomplete
        value={selectedLocation}
        onChange={setSelectedLocation}
        placeholder="Location"
        className="w-full"
      />

      <Select value={selectedGenre} onValueChange={setSelectedGenre}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Genre" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {genres.map((genre) => (
            <SelectItem key={genre} value={genre}>{genre}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
        <SelectTrigger className="bg-background">
          <SelectValue placeholder="Capacity" />
        </SelectTrigger>
        <SelectContent>
          {capacityRanges.map((range) => (
            <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-accent">
        FIND VENUES
      </h1>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:flex gap-2">
          <LocationAutocomplete
            value={selectedLocation}
            onChange={setSelectedLocation}
            placeholder="Location"
            className="w-48"
          />
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-32 bg-card border-border">
              <Music className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
            <SelectTrigger className="w-28 bg-card border-border">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {capacityRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mobile Filters */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="outline" size="icon" className="border-border">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent className="bg-card border-border">
            <div className="mt-8">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card h-56 animate-pulse" />
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="text-center py-20">
          <h3 className="font-display text-2xl text-muted-foreground">NO VENUES</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVenues.map((venue) => (
            <div
              key={venue.id}
              className="group bg-card border border-border overflow-hidden transition-all hover:border-primary cursor-pointer"
            >
              {/* Image */}
              <div className="aspect-[4/3] bg-secondary relative overflow-hidden">
                {venue.pictures && venue.pictures.length > 0 ? (
                  <img
                    src={venue.pictures[0]}
                    alt={venue.venue_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-heat">
                    <Music className="h-12 w-12 text-primary/30" />
                  </div>
                )}
                {/* Capacity badge */}
                {venue.capacity && (
                  <div className="absolute top-2 right-2 bg-background/90 px-2 py-0.5 text-xs font-display tracking-wider flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {venue.capacity}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors tracking-wide">
                  {venue.venue_name}
                </h3>
                {venue.location && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {venue.location}
                  </p>
                )}
                {venue.genres && venue.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {venue.genres.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className="text-[10px] bg-secondary px-2 py-0.5 text-muted-foreground uppercase tracking-wider"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
