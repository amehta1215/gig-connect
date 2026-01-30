import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { AccountInformation } from '@/components/AccountInformation';
import { toast } from 'sonner';
import { ArrowLeft, Save, Upload, X, Plus, MapPin, Users, Music, Trash2, Pencil, Eye } from 'lucide-react';
import { RoomPreviewSheet } from '@/components/RoomPreviewSheet';
interface VenueProfileData {
  id: string;
  user_id: string;
  venue_name: string | null;
  location: string | null;
  bio: string | null;
  event_types: string[];
  picture: string | null;
}
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
const eventTypeOptions = [{
  id: 'dj',
  label: 'DJ'
}, {
  id: 'comedy',
  label: 'Comedy'
}, {
  id: 'live_music',
  label: 'Live Music'
}, {
  id: 'open_mic',
  label: 'Open Mic'
}, {
  id: 'karaoke',
  label: 'Karaoke'
}, {
  id: 'private_events',
  label: 'Private Events'
}];
const availableGenres = ['All', 'Rock', 'Jazz', 'Electronic', 'Hip-Hop', 'Pop', 'Folk', 'Metal', 'Indie', 'Blues', 'Country'];
export default function VenueProfile() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<VenueProfileData | null>(null);
  const [formData, setFormData] = useState({
    venue_name: '',
    location: '',
    bio: '',
    event_types: [] as string[],
    picture: '' as string | null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Room management state
  const [listings, setListings] = useState<VenueListing[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'preview' | 'edit'>('preview');
  const [editingListing, setEditingListing] = useState<VenueListing | null>(null);
  const [savingRoom, setSavingRoom] = useState(false);
  const [pictures, setPictures] = useState<string[]>([]);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const [roomFormData, setRoomFormData] = useState({
    venue_name: '',
    room_name: '',
    location: '',
    capacity: '',
    genres: [] as string[],
    backline_info: '',
    house_rules: ''
  });
  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);
  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('venue_profiles').select('*').eq('user_id', user.id).single();
    if (data && !error) {
      setProfile(data as VenueProfileData);
      setFormData({
        venue_name: data.venue_name || '',
        location: data.location || '',
        bio: data.bio || '',
        event_types: data.event_types || [],
        picture: data.picture || null
      });
      fetchListings(data.id);
    } else {
      setLoading(false);
    }
  };
  const fetchListings = async (profileId: string) => {
    const {
      data,
      error
    } = await supabase.from('venue_listings').select('*').eq('venue_profile_id', profileId).order('created_at', {
      ascending: false
    });
    if (data && !error) {
      setListings(data as VenueListing[]);
    }
    setLoading(false);
  };
  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const {
      error
    } = await supabase.from('venue_profiles').update({
      venue_name: formData.venue_name || null,
      location: formData.location || null,
      bio: formData.bio || null,
      event_types: formData.event_types,
      picture: formData.picture || null
    }).eq('id', profile.id);
    if (error) {
      toast.error('Failed to save profile');
      setSaving(false);
    } else {
      toast.success('Profile saved successfully');
      navigate('/venue');
    }
  };
  const toggleEventType = (eventType: string) => {
    if (formData.event_types.includes(eventType)) {
      setFormData({
        ...formData,
        event_types: formData.event_types.filter(e => e !== eventType)
      });
    } else {
      setFormData({
        ...formData,
        event_types: [...formData.event_types, eventType]
      });
    }
  };
  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload JPG, PNG, WebP, or GIF images only. HEIC files are not supported by web browsers.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/venue-picture-${Date.now()}.${fileExt}`;
    const {
      error: uploadError
    } = await supabase.storage.from('venue-media').upload(fileName, file);
    if (uploadError) {
      toast.error('Failed to upload picture');
      return;
    }
    const {
      data: urlData
    } = supabase.storage.from('venue-media').getPublicUrl(fileName);
    setFormData({
      ...formData,
      picture: urlData.publicUrl
    });
    toast.success('Picture uploaded');
  };
  const removePicture = async () => {
    if (!formData.picture) return;
    const url = formData.picture;
    const bucketPath = url.split('/venue-media/')[1];
    if (bucketPath) {
      await supabase.storage.from('venue-media').remove([bucketPath]);
    }
    setFormData({
      ...formData,
      picture: null
    });
  };

  // Room management functions
  const resetRoomForm = () => {
    setRoomFormData({
      venue_name: formData.venue_name,
      room_name: '',
      location: formData.location,
      capacity: '',
      genres: [],
      backline_info: '',
      house_rules: ''
    });
    setPictures([]);
    setEditingListing(null);
  };
  const openDialog = (listing?: VenueListing, mode: 'preview' | 'edit' = 'edit') => {
    if (listing) {
      setEditingListing(listing);
      setRoomFormData({
        venue_name: listing.venue_name,
        room_name: listing.room_name || '',
        location: listing.location || '',
        capacity: listing.capacity?.toString() || '',
        genres: listing.genres || [],
        backline_info: listing.backline_info || '',
        house_rules: listing.house_rules || ''
      });
      setPictures(listing.pictures || []);
    } else {
      resetRoomForm();
    }
    setDialogMode(mode);
    setIsDialogOpen(true);
  };
  const uploadFile = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/listings/${Date.now()}.${fileExt}`;
    const {
      error: uploadError
    } = await supabase.storage.from('venue-media').upload(fileName, file);
    if (uploadError) throw uploadError;
    const {
      data
    } = supabase.storage.from('venue-media').getPublicUrl(fileName);
    return data.publicUrl;
  };
  const handleRoomPictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload JPG, PNG, WebP, or GIF images only. HEIC files are not supported by web browsers.');
        if (pictureInputRef.current) pictureInputRef.current.value = '';
        return;
      }
    }
    setUploadingPicture(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        newUrls.push(url);
      }
      setPictures(prev => [...prev, ...newUrls]);
      toast.success('Photo uploaded');
    } catch (error) {
      toast.error('Upload failed');
    }
    setUploadingPicture(false);
    if (pictureInputRef.current) pictureInputRef.current.value = '';
  };
  const removeRoomPicture = (index: number) => {
    setPictures(prev => prev.filter((_, i) => i !== index));
  };
  const handleSaveRoom = async () => {
    if (!profile || !roomFormData.venue_name) {
      toast.error('Venue name required');
      return;
    }
    setSavingRoom(true);
    const listingData = {
      venue_profile_id: profile.id,
      venue_name: roomFormData.venue_name,
      room_name: roomFormData.room_name || null,
      location: roomFormData.location || null,
      capacity: roomFormData.capacity ? parseInt(roomFormData.capacity) : null,
      genres: roomFormData.genres,
      pictures: pictures,
      backline_info: roomFormData.backline_info || null,
      house_rules: roomFormData.house_rules || null
    };
    let error;
    if (editingListing) {
      const result = await supabase.from('venue_listings').update(listingData).eq('id', editingListing.id);
      error = result.error;
    } else {
      const result = await supabase.from('venue_listings').insert(listingData);
      error = result.error;
    }
    if (error) {
      toast.error('Failed');
    } else {
      toast.success(editingListing ? 'Updated' : 'Created');
      setIsDialogOpen(false);
      resetRoomForm();
      fetchListings(profile.id);
    }
    setSavingRoom(false);
  };
  const handleDeleteRoom = async (listingId: string) => {
    if (!confirm('Delete this room?')) return;
    const {
      error
    } = await supabase.from('venue_listings').delete().eq('id', listingId);
    if (error) {
      toast.error('Failed');
    } else {
      toast.success('Deleted');
      setListings(listings.filter(l => l.id !== listingId));
    }
  };
  const toggleGenre = (genre: string) => {
    if (roomFormData.genres.includes(genre)) {
      setRoomFormData({
        ...roomFormData,
        genres: roomFormData.genres.filter(g => g !== genre)
      });
    } else {
      setRoomFormData({
        ...roomFormData,
        genres: [...roomFormData.genres, genre]
      });
    }
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-display text-4xl text-accent font-bold">VENUE PROFILE</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      {/* Venue Picture Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <h2 className="font-display text-xl">VENUE PICTURE <span className="text-destructive">*</span></h2>
        </div>

        <input type="file" ref={fileInputRef} onChange={handlePictureUpload} accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" />

        {formData.picture ? <div className="relative w-full max-w-md">
            <img src={formData.picture} alt="Venue" className="w-full aspect-[4/3] object-cover rounded-lg" />
            <Button variant="destructive" size="icon" className="absolute top-2 right-2" onClick={removePicture}>
              <X className="h-4 w-4" />
            </Button>
          </div> : <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full max-w-md h-32 border-dashed flex flex-col gap-2">
            <Upload className="h-6 w-6" />
            <span>Upload Venue Picture</span>
          </Button>}
      </div>

      {/* Venue Info Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <h2 className="font-display text-xl">Venue Info</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="venue_name">Venue Name <span className="text-destructive">*</span></Label>
          <Input id="venue_name" value={formData.venue_name} onChange={e => setFormData({
          ...formData,
          venue_name: e.target.value
        })} placeholder="The Blue Note" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location <span className="text-destructive">*</span></Label>
          <LocationAutocomplete value={formData.location} onChange={value => setFormData({
          ...formData,
          location: value
        })} placeholder="New York, NY" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio <span className="text-destructive">*</span></Label>
          <Textarea id="bio" value={formData.bio} onChange={e => setFormData({
          ...formData,
          bio: e.target.value
        })} placeholder="Tell artists about your venue, its vibe, and what makes it special..." rows={4} />
        </div>
      </div>

      {/* Event Types Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <h2 className="font-display text-xl">Event Types <span className="text-destructive">*</span></h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {eventTypeOptions.map(option => <div key={option.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${formData.event_types.includes(option.id) ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`} onClick={() => toggleEventType(option.id)}>
              <Checkbox checked={formData.event_types.includes(option.id)} onCheckedChange={() => toggleEventType(option.id)} />
              <Label className="cursor-pointer">{option.label}</Label>
            </div>)}
        </div>
      </div>

      {/* Rooms Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-primary">ROOMS <span className="text-destructive">*</span></h2>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog(undefined, 'edit')} className="font-display tracking-widest" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                ADD
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 bg-card border-border">
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
                <div className="flex items-center justify-between">
                  <DialogTitle className="font-display text-2xl tracking-wide text-accent font-bold">
                    {editingListing ? (roomFormData.room_name || roomFormData.venue_name || 'ROOM') : 'NEW ROOM'}
                  </DialogTitle>
                  {editingListing && (
                    <div className="flex gap-2">
                      <Button
                        variant={dialogMode === 'preview' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDialogMode('preview')}
                        className="font-display tracking-widest"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        PREVIEW
                      </Button>
                      <Button
                        variant={dialogMode === 'edit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setDialogMode('edit')}
                        className="font-display tracking-widest"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        EDIT
                      </Button>
                    </div>
                  )}
                </div>
              </DialogHeader>

              {dialogMode === 'preview' && editingListing ? (
                /* Preview Content - Inline version of RoomPreviewSheet */
                <div className="flex-1 overflow-y-auto px-6 py-6">
                  {/* Pictures Gallery */}
                  <div className="mb-10">
                    {(() => {
                      const allPictures: string[] = [];
                      if (formData.picture) allPictures.push(formData.picture);
                      if (pictures.length > 0) allPictures.push(...pictures);
                      
                      return allPictures.length === 0 ? (
                        <div className="aspect-[4/3] max-w-xs bg-secondary rounded-lg overflow-hidden">
                          <div className="w-full h-full flex items-center justify-center bg-heat">
                            <Music className="h-12 w-12 text-primary/30" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap justify-center gap-2">
                          {allPictures.map((pic, index) => (
                            <div 
                              key={index} 
                              className="w-[calc(50%-0.25rem)] md:w-[calc(33.333%-0.375rem)] aspect-[4/3] bg-secondary rounded-lg overflow-hidden"
                            >
                              <img 
                                src={pic} 
                                alt={`${roomFormData.venue_name} ${index + 1}`} 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Two Column Layout */}
                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Left Column - Venue Info */}
                    <div className="flex-1 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <h1 className="font-display text-3xl text-accent font-bold tracking-wide">
                            {roomFormData.venue_name || 'Venue Name'}
                          </h1>
                          {roomFormData.room_name && (
                            <p className="text-lg text-muted-foreground mt-1">{roomFormData.room_name}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                          {roomFormData.location && (
                            <span className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              {roomFormData.location}
                            </span>
                          )}
                          {roomFormData.capacity && (
                            <span className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {roomFormData.capacity} capacity
                            </span>
                          )}
                        </div>

                        {roomFormData.genres && roomFormData.genres.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {roomFormData.genres.map(genre => (
                              <span 
                                key={genre} 
                                className="text-xs bg-secondary px-3 py-1 uppercase tracking-wider font-display"
                              >
                                {genre}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="space-y-4">
                        {roomFormData.backline_info && (
                          <div className="bg-background border border-border rounded-lg p-4">
                            <h3 className="font-display text-sm text-primary tracking-widest mb-2">BACKLINE</h3>
                            <p className="text-muted-foreground text-sm">{roomFormData.backline_info}</p>
                          </div>
                        )}
                        {roomFormData.house_rules && (
                          <div className="bg-background border border-border rounded-lg p-4">
                            <h3 className="font-display text-sm text-primary tracking-widest mb-2">HOUSE RULES</h3>
                            <p className="text-muted-foreground text-sm">{roomFormData.house_rules}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Column - Apply Form Preview (Disabled) */}
                    <div className="lg:w-72">
                      <div className="lg:sticky lg:top-0 bg-background border border-border rounded-lg p-6 space-y-6 opacity-70">
                        <h2 className="font-display text-2xl text-accent font-bold">APPLY</h2>
                        <p className="text-sm text-muted-foreground">This is a preview of how artists will see your listing.</p>
                        <Button disabled className="w-full font-display tracking-widest text-lg py-6">
                          APPLY
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Content */
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                  {/* Photo Upload */}
                  <div className="space-y-4">
                    <h3 className="font-display text-sm text-primary tracking-widest">PHOTOS</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {pictures.map((url, index) => <div key={index} className="relative group aspect-square">
                          <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
                          <button type="button" onClick={() => removeRoomPicture(index)} className="absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="h-4 w-4 text-destructive-foreground" />
                          </button>
                        </div>)}
                      <button type="button" onClick={() => pictureInputRef.current?.click()} disabled={uploadingPicture} className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {uploadingPicture ? 'Uploading...' : 'Add Photo'}
                        </span>
                      </button>
                    </div>
                    <input ref={pictureInputRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif" className="hidden" onChange={handleRoomPictureUpload} />
                  </div>

                  {/* General Info */}
                  <div className="space-y-4">
                    <h3 className="font-display text-sm text-primary tracking-widest">GENERAL</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="room_venue_name" className="text-xs uppercase tracking-wider text-muted-foreground">Venue *</Label>
                        <Input id="room_venue_name" value={roomFormData.venue_name} onChange={e => setRoomFormData({
                        ...roomFormData,
                        venue_name: e.target.value
                      })} className="bg-background border-border" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="room_name" className="text-xs uppercase tracking-wider text-muted-foreground">Room</Label>
                        <Input id="room_name" value={roomFormData.room_name} onChange={e => setRoomFormData({
                        ...roomFormData,
                        room_name: e.target.value
                      })} className="bg-background border-border" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="room_location" className="text-xs uppercase tracking-wider text-muted-foreground">Location</Label>
                        <LocationAutocomplete value={roomFormData.location} onChange={value => setRoomFormData({
                        ...roomFormData,
                        location: value
                      })} placeholder="Search location..." className="bg-background" />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="room_capacity" className="text-xs uppercase tracking-wider text-muted-foreground">Capacity</Label>
                        <Input id="room_capacity" type="number" value={roomFormData.capacity} onChange={e => setRoomFormData({
                        ...roomFormData,
                        capacity: e.target.value
                      })} className="bg-background border-border" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Genres</Label>
                      <div className="flex flex-wrap gap-1">
                        {availableGenres.map(genre => <button key={genre} type="button" onClick={() => toggleGenre(genre)} className={`px-3 py-1 text-xs font-display tracking-wider transition-colors ${roomFormData.genres.includes(genre) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>
                            {genre.toUpperCase()}
                          </button>)}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="space-y-4">
                    <h3 className="font-display text-sm text-primary tracking-widest">DETAILS</h3>
                    <div className="space-y-1">
                      <Label htmlFor="backline_info" className="text-xs uppercase tracking-wider text-muted-foreground">Backline</Label>
                      <Textarea id="backline_info" value={roomFormData.backline_info} onChange={e => setRoomFormData({
                      ...roomFormData,
                      backline_info: e.target.value
                    })} className="bg-background border-border" rows={2} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="house_rules" className="text-xs uppercase tracking-wider text-muted-foreground">Rules</Label>
                      <Textarea id="house_rules" value={roomFormData.house_rules} onChange={e => setRoomFormData({
                      ...roomFormData,
                      house_rules: e.target.value
                    })} className="bg-background border-border" rows={2} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between pt-4 border-t border-border">
                    <div className="flex gap-2">
                      {editingListing && <Button variant="outline" size="icon" onClick={() => {
                      handleDeleteRoom(editingListing.id);
                      setIsDialogOpen(false);
                    }} className="text-destructive hover:bg-destructive hover:text-destructive-foreground border-border">
                          <Trash2 className="h-4 w-4" />
                        </Button>}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="font-display tracking-widest">
                        CANCEL
                      </Button>
                      <Button onClick={handleSaveRoom} disabled={savingRoom} className="font-display tracking-widest">
                        {savingRoom ? '...' : editingListing ? 'UPDATE' : 'CREATE'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <h3 className="font-display text-lg text-muted-foreground mb-4">NO ROOMS</h3>
            <Button onClick={() => openDialog(undefined, 'edit')} className="font-display tracking-widest">
              <Plus className="h-4 w-4 mr-2" />
              ADD ROOM
            </Button>
          </div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {listings.map(listing => <div 
                key={listing.id} 
                className="bg-background border border-border overflow-hidden hover:border-primary/50 transition-colors rounded-lg cursor-pointer"
                onClick={() => openDialog(listing, 'preview')}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-secondary flex items-center justify-center overflow-hidden">
                  {listing.pictures && listing.pictures.length > 0 ? <img src={listing.pictures[0]} alt={listing.venue_name} className="w-full h-full object-cover" /> : <div className="bg-heat w-full h-full flex items-center justify-center">
                      <Music className="h-12 w-12 text-primary/30" />
                    </div>}
                </div>

                {/* Content */}
                <div className="p-3">
                  <h3 className="font-display text-lg text-foreground tracking-wide">
                    ROOM NAME: {listing.room_name || listing.venue_name}
                  </h3>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {listing.location && <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {listing.location}
                      </span>}
                    {listing.capacity && <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {listing.capacity}
                      </span>}
                  </div>

                  {listing.genres && listing.genres.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                      {listing.genres.slice(0, 2).map(genre => <span key={genre} className="text-[10px] bg-secondary px-2 py-0.5 uppercase tracking-wider">
                          {genre}
                        </span>)}
                    </div>}
                </div>
              </div>)}
          </div>}
      </div>

      {/* Account Information Section */}
      <AccountInformation />
    </div>;
}