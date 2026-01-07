import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, MapPin, Users, Music, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface VenueListing {
  id: string;
  venue_profile_id: string;
  venue_name: string;
  room_name: string | null;
  location: string | null;
  capacity: number | null;
  genres: string[];
  pictures: string[];
  bio: string | null;
  backline_info: string | null;
  house_rules: string | null;
}

const availableGenres = ['Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];

export default function VenueListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<VenueListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [venueProfileId, setVenueProfileId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<VenueListing | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    venue_name: '',
    room_name: '',
    location: '',
    capacity: '',
    genres: [] as string[],
    bio: '',
    backline_info: '',
    house_rules: '',
  });

  useEffect(() => {
    if (user) {
      fetchVenueProfile();
    }
  }, [user]);

  const fetchVenueProfile = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (profile) {
      setVenueProfileId(profile.id);
      fetchListings(profile.id);
    } else {
      setLoading(false);
    }
  };

  const fetchListings = async (profileId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('venue_listings')
      .select('*')
      .eq('venue_profile_id', profileId)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setListings(data as VenueListing[]);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      venue_name: '',
      room_name: '',
      location: '',
      capacity: '',
      genres: [],
      bio: '',
      backline_info: '',
      house_rules: '',
    });
    setEditingListing(null);
  };

  const openDialog = (listing?: VenueListing) => {
    if (listing) {
      setEditingListing(listing);
      setFormData({
        venue_name: listing.venue_name,
        room_name: listing.room_name || '',
        location: listing.location || '',
        capacity: listing.capacity?.toString() || '',
        genres: listing.genres || [],
        bio: listing.bio || '',
        backline_info: listing.backline_info || '',
        house_rules: listing.house_rules || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!venueProfileId || !formData.venue_name) {
      toast.error('Venue name required');
      return;
    }

    setSaving(true);

    const listingData = {
      venue_profile_id: venueProfileId,
      venue_name: formData.venue_name,
      room_name: formData.room_name || null,
      location: formData.location || null,
      capacity: formData.capacity ? parseInt(formData.capacity) : null,
      genres: formData.genres,
      bio: formData.bio || null,
      backline_info: formData.backline_info || null,
      house_rules: formData.house_rules || null,
    };

    let error;
    if (editingListing) {
      const result = await supabase
        .from('venue_listings')
        .update(listingData)
        .eq('id', editingListing.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('venue_listings')
        .insert(listingData);
      error = result.error;
    }

    if (error) {
      toast.error('Failed');
    } else {
      toast.success(editingListing ? 'Updated' : 'Created');
      setIsDialogOpen(false);
      resetForm();
      fetchListings(venueProfileId);
    }
    setSaving(false);
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Delete this listing?')) return;

    const { error } = await supabase
      .from('venue_listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      toast.error('Failed');
    } else {
      toast.success('Deleted');
      setListings(listings.filter(l => l.id !== listingId));
    }
  };

  const toggleGenre = (genre: string) => {
    if (formData.genres.includes(genre)) {
      setFormData({ ...formData, genres: formData.genres.filter(g => g !== genre) });
    } else {
      setFormData({ ...formData, genres: [...formData.genres, genre] });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display section-title text-accent font-bold">LISTINGS</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()} className="font-display tracking-widest">
              <Plus className="h-4 w-4 mr-2" />
              ADD
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl tracking-wide">
                {editingListing ? 'EDIT' : 'NEW LISTING'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* General Info */}
              <div className="space-y-4">
                <h3 className="font-display text-sm text-primary tracking-widest">GENERAL</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="venue_name" className="text-xs uppercase tracking-wider text-muted-foreground">Venue *</Label>
                    <Input
                      id="venue_name"
                      value={formData.venue_name}
                      onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="room_name" className="text-xs uppercase tracking-wider text-muted-foreground">Room</Label>
                    <Input
                      id="room_name"
                      value={formData.room_name}
                      onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="location" className="text-xs uppercase tracking-wider text-muted-foreground">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="capacity" className="text-xs uppercase tracking-wider text-muted-foreground">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Genres</Label>
                  <div className="flex flex-wrap gap-1">
                    {availableGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3 py-1 text-xs font-display tracking-wider transition-colors ${
                          formData.genres.includes(genre)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {genre.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-display text-sm text-primary tracking-widest">DETAILS</h3>
                <div className="space-y-1">
                  <Label htmlFor="bio" className="text-xs uppercase tracking-wider text-muted-foreground">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="bg-background border-border"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="backline_info" className="text-xs uppercase tracking-wider text-muted-foreground">Backline</Label>
                  <Textarea
                    id="backline_info"
                    value={formData.backline_info}
                    onChange={(e) => setFormData({ ...formData, backline_info: e.target.value })}
                    className="bg-background border-border"
                    rows={2}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="house_rules" className="text-xs uppercase tracking-wider text-muted-foreground">Rules</Label>
                  <Textarea
                    id="house_rules"
                    value={formData.house_rules}
                    onChange={(e) => setFormData({ ...formData, house_rules: e.target.value })}
                    className="bg-background border-border"
                    rows={2}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-display tracking-widest">
                  CANCEL
                </Button>
                <Button onClick={handleSave} disabled={saving} className="font-display tracking-widest">
                  {saving ? '...' : editingListing ? 'UPDATE' : 'CREATE'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border">
          <h3 className="font-display text-xl text-muted-foreground mb-4">NO LISTINGS</h3>
          <Button onClick={() => openDialog()} className="font-display tracking-widest">
            <Plus className="h-4 w-4 mr-2" />
            ADD
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-card border border-border overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Image placeholder */}
              <div className="aspect-[4/3] bg-secondary flex items-center justify-center bg-heat">
                <Music className="h-12 w-12 text-primary/30" />
              </div>

              {/* Content */}
              <div className="p-3">
                <h3 className="font-display text-xl text-foreground tracking-wide">{listing.venue_name}</h3>
                {listing.room_name && (
                  <p className="text-xs text-muted-foreground">{listing.room_name}</p>
                )}
                
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  {listing.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {listing.location}
                    </span>
                  )}
                  {listing.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {listing.capacity}
                    </span>
                  )}
                </div>

                {listing.genres && listing.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {listing.genres.slice(0, 2).map((genre) => (
                      <span
                        key={genre}
                        className="text-[10px] bg-secondary px-2 py-0.5 uppercase tracking-wider"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 font-display tracking-widest text-xs border-border"
                    onClick={() => openDialog(listing)}
                  >
                    EDIT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-border"
                    onClick={() => handleDelete(listing.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
