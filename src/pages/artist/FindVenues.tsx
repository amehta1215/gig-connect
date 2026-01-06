import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, MapPin, Users, Music, Filter } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

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
  { label: 'Any capacity', value: 'any' },
  { label: 'Under 100', value: '0-100' },
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
      <div className="space-y-2">
        <Label>Location</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="City or neighborhood"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Genre</Label>
        <Select value={selectedGenre} onValueChange={setSelectedGenre}>
          <SelectTrigger>
            <SelectValue placeholder="All genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {genres.map((genre) => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Capacity</Label>
        <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
          <SelectTrigger>
            <SelectValue placeholder="Any capacity" />
          </SelectTrigger>
          <SelectContent>
            {capacityRanges.map((range) => (
              <SelectItem key={range.value} value={range.value}>{range.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-gradient">Find Venues</h1>
        <p className="text-muted-foreground mt-1">Discover your next stage</p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search venues..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Desktop Filters */}
        <div className="hidden lg:flex gap-3">
          <div className="relative w-48">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Location"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
            <SelectTrigger className="w-36">
              <Music className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Genre" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genres</SelectItem>
              {genres.map((genre) => (
                <SelectItem key={genre} value={genre}>{genre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
            <SelectTrigger className="w-36">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Capacity" />
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
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-card rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-2xl mb-2">No venues found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVenues.map((venue) => (
            <div
              key={venue.id}
              className="group bg-card hover:bg-card-hover border border-border rounded-xl overflow-hidden transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 cursor-pointer"
            >
              {/* Image */}
              <div className="aspect-video bg-secondary relative overflow-hidden">
                {venue.pictures && venue.pictures.length > 0 ? (
                  <img
                    src={venue.pictures[0]}
                    alt={venue.venue_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Music className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                {/* Capacity badge */}
                {venue.capacity && (
                  <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {venue.capacity}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors">
                  {venue.venue_name}
                </h3>
                {venue.room_name && (
                  <p className="text-sm text-muted-foreground">{venue.room_name}</p>
                )}
                {venue.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {venue.location}
                  </p>
                )}
                {venue.genres && venue.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {venue.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground"
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
