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
import { Plus, MapPin, Users, Music, Edit, Trash2, Building2 } from 'lucide-react';
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
      toast.error('Venue name is required');
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
      toast.error('Failed to save listing');
    } else {
      toast.success(editingListing ? 'Listing updated' : 'Listing created');
      setIsDialogOpen(false);
      resetForm();
      fetchListings(venueProfileId);
    }
    setSaving(false);
  };

  const handleDelete = async (listingId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    const { error } = await supabase
      .from('venue_listings')
      .delete()
      .eq('id', listingId);

    if (error) {
      toast.error('Failed to delete listing');
    } else {
      toast.success('Listing deleted');
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
        <div>
          <h1 className="font-display text-4xl md:text-5xl text-gradient">Listings</h1>
          <p className="text-muted-foreground mt-1">Manage your venue rooms</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Listing
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">
                {editingListing ? 'Edit Listing' : 'Create Listing'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* General Info */}
              <div className="space-y-4">
                <h3 className="font-display text-lg text-primary">General</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue_name">Venue Name *</Label>
                    <Input
                      id="venue_name"
                      value={formData.venue_name}
                      onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                      placeholder="The Blue Note"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="room_name">Room Name</Label>
                    <Input
                      id="room_name"
                      value={formData.room_name}
                      onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                      placeholder="Main Stage"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="New York, NY"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                      placeholder="200"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Genres</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableGenres.map((genre) => (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => toggleGenre(genre)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          formData.genres.includes(genre)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-display text-lg text-primary">Additional Info</h3>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell artists about this space..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="backline_info">Backline Info</Label>
                  <Textarea
                    id="backline_info"
                    value={formData.backline_info}
                    onChange={(e) => setFormData({ ...formData, backline_info: e.target.value })}
                    placeholder="Equipment available..."
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="house_rules">House Rules</Label>
                  <Textarea
                    id="house_rules"
                    value={formData.house_rules}
                    onChange={(e) => setFormData({ ...formData, house_rules: e.target.value })}
                    placeholder="Important rules and guidelines..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving...' : editingListing ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-2xl mb-2">No listings yet</h3>
          <p className="text-muted-foreground mb-6">Create your first listing to start receiving applications</p>
          <Button onClick={() => openDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Listing
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Image placeholder */}
              <div className="aspect-video bg-secondary flex items-center justify-center">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-display text-xl text-foreground">{listing.venue_name}</h3>
                {listing.room_name && (
                  <p className="text-sm text-muted-foreground">{listing.room_name}</p>
                )}
                
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
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
                  <div className="flex flex-wrap gap-1 mt-3">
                    {listing.genres.slice(0, 3).map((genre) => (
                      <span
                        key={genre}
                        className="text-xs bg-secondary px-2 py-0.5 rounded-full"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openDialog(listing)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
