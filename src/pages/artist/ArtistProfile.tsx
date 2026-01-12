import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LocationAutocomplete } from '@/components/LocationAutocomplete';
import { AccountInformation } from '@/components/AccountInformation';
import { toast } from 'sonner';
import { ArrowLeft, Save, Music, X, Upload } from 'lucide-react';
interface ArtistProfile {
  id: string;
  user_id: string;
  band_name: string | null;
  genre: string | null;
  location: string | null;
  bio: string | null;
  spotify_link: string | null;
  soundcloud_link: string | null;
  apple_music_link: string | null;
  youtube_link: string | null;
  facebook_link: string | null;
  tiktok_link: string | null;
  pictures: string[];
  featured_samples: string[];
  past_gigs: string[];
  press_links: string[];
}
export default function ArtistProfile() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [pictures, setPictures] = useState<string[]>([]);
  const [featuredSamples, setFeaturedSamples] = useState<string[]>([]);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingSample, setUploadingSample] = useState(false);
  const pictureInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    band_name: '',
    genre: '',
    location: '',
    bio: '',
    spotify_link: '',
    soundcloud_link: '',
    apple_music_link: '',
    youtube_link: '',
    facebook_link: '',
    tiktok_link: '',
    past_gigs: '',
    press_links: ''
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
    } = await supabase.from('artist_profiles').select('*').eq('user_id', user.id).single();
    if (data && !error) {
      setProfile(data as ArtistProfile);
      setPictures(data.pictures || []);
      setFeaturedSamples(data.featured_samples || []);
      setFormData({
        band_name: data.band_name || '',
        genre: data.genre || '',
        location: data.location || '',
        bio: data.bio || '',
        spotify_link: data.spotify_link || '',
        soundcloud_link: data.soundcloud_link || '',
        apple_music_link: data.apple_music_link || '',
        youtube_link: data.youtube_link || '',
        facebook_link: data.facebook_link || '',
        tiktok_link: data.tiktok_link || '',
        past_gigs: (data.past_gigs || []).join('\n'),
        press_links: (data.press_links || []).join('\n')
      });
    }
    setLoading(false);
  };
  const uploadFile = async (file: File, bucket: string, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user?.id}/${folder}/${Date.now()}.${fileExt}`;
    const {
      error: uploadError
    } = await supabase.storage.from(bucket).upload(fileName, file);
    if (uploadError) throw uploadError;
    const {
      data
    } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return data.publicUrl;
  };
  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPicture(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, 'artist-media', 'pictures');
        newUrls.push(url);
      }
      setPictures(prev => [...prev, ...newUrls]);
      toast.success('Pictures uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload pictures');
    }
    setUploadingPicture(false);
    if (pictureInputRef.current) pictureInputRef.current.value = '';
  };
  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (featuredSamples.length + files.length > 3) {
      toast.error('Maximum 3 samples allowed');
      return;
    }
    setUploadingSample(true);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, 'artist-media', 'samples');
        newUrls.push(url);
      }
      setFeaturedSamples(prev => [...prev, ...newUrls]);
      toast.success('Samples uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload samples');
    }
    setUploadingSample(false);
    if (sampleInputRef.current) sampleInputRef.current.value = '';
  };
  const removePicture = (index: number) => {
    setPictures(prev => prev.filter((_, i) => i !== index));
  };
  const removeSample = (index: number) => {
    setFeaturedSamples(prev => prev.filter((_, i) => i !== index));
  };
  const handleSave = async () => {
    if (!user || !profile) return;
    setSaving(true);
    const {
      error
    } = await supabase.from('artist_profiles').update({
      band_name: formData.band_name || null,
      genre: formData.genre || null,
      location: formData.location || null,
      bio: formData.bio || null,
      spotify_link: formData.spotify_link || null,
      soundcloud_link: formData.soundcloud_link || null,
      apple_music_link: formData.apple_music_link || null,
      youtube_link: formData.youtube_link || null,
      facebook_link: formData.facebook_link || null,
      tiktok_link: formData.tiktok_link || null,
      pictures: pictures,
      featured_samples: featuredSamples,
      past_gigs: formData.past_gigs.split('\n').filter(Boolean),
      press_links: formData.press_links.split('\n').filter(Boolean)
    }).eq('id', profile.id);
    if (error) {
      toast.error('Failed to save profile');
      setSaving(false);
    } else {
      toast.success('Profile saved successfully');
      navigate('/artist');
    }
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
      </div>;
  }
  return <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-4xl text-accent font-black">EDIT ARTIST PROFILE</h1>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <h2 className="font-display text-xl">BAND INFORMATION</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="band_name">Band / Stage Name</Label>
            <Input id="band_name" value={formData.band_name} onChange={e => setFormData({
            ...formData,
            band_name: e.target.value
          })} placeholder="The Midnight Riders" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="genre">Genre</Label>
            <Input id="genre" value={formData.genre} onChange={e => setFormData({
            ...formData,
            genre: e.target.value
          })} placeholder="Rock, Indie" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <LocationAutocomplete
            value={formData.location}
            onChange={(value) => setFormData({ ...formData, location: value })}
            placeholder="Los Angeles, CA"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={formData.bio} onChange={e => setFormData({
          ...formData,
          bio: e.target.value
        })} placeholder="Tell venues about your music, style, and experience..." rows={4} />
        </div>
      </div>

      {/* Links Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <h2 className="font-display text-xl">SOCIAL LINKS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="spotify">Spotify</Label>
            <Input id="spotify" value={formData.spotify_link} onChange={e => setFormData({
            ...formData,
            spotify_link: e.target.value
          })} placeholder="https://open.spotify.com/artist/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="soundcloud">SoundCloud</Label>
            <Input id="soundcloud" value={formData.soundcloud_link} onChange={e => setFormData({
            ...formData,
            soundcloud_link: e.target.value
          })} placeholder="https://soundcloud.com/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apple_music">Apple Music</Label>
            <Input id="apple_music" value={formData.apple_music_link} onChange={e => setFormData({
            ...formData,
            apple_music_link: e.target.value
          })} placeholder="https://music.apple.com/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="youtube">YouTube</Label>
            <Input id="youtube" value={formData.youtube_link} onChange={e => setFormData({
            ...formData,
            youtube_link: e.target.value
          })} placeholder="https://youtube.com/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="facebook">Facebook</Label>
            <Input id="facebook" value={formData.facebook_link} onChange={e => setFormData({
            ...formData,
            facebook_link: e.target.value
          })} placeholder="https://facebook.com/..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tiktok">TikTok</Label>
            <Input id="tiktok" value={formData.tiktok_link} onChange={e => setFormData({
            ...formData,
            tiktok_link: e.target.value
          })} placeholder="https://tiktok.com/@..." />
          </div>
        </div>
      </div>

      {/* Pictures Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          
          <h2 className="font-display text-xl">PICTURES</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {pictures.map((url, index) => <div key={index} className="relative group aspect-square">
              <img src={url} alt={`Picture ${index + 1}`} className="w-full h-full object-cover rounded-lg" />
              <button onClick={() => removePicture(index)} className="absolute top-2 right-2 p-1 bg-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4 text-destructive-foreground" />
              </button>
            </div>)}
          <button onClick={() => pictureInputRef.current?.click()} disabled={uploadingPicture} className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {uploadingPicture ? 'Uploading...' : 'Add Picture'}
            </span>
          </button>
        </div>
        <input ref={pictureInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePictureUpload} />
      </div>

      {/* Featured Samples Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          
          <h2 className="font-display text-xl">FEATURED SAMPLES</h2>
        </div>
        

        <div className="space-y-3">
          {featuredSamples.map((url, index) => <div key={index} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
              <Music className="h-5 w-5 text-primary" />
              <audio controls className="flex-1 h-10">
                <source src={url} />
              </audio>
              <button onClick={() => removeSample(index)} className="p-1 hover:bg-destructive/20 rounded-full transition-colors">
                <X className="h-4 w-4 text-destructive" />
              </button>
            </div>)}
          {featuredSamples.length < 3 && <button onClick={() => sampleInputRef.current?.click()} disabled={uploadingSample} className="w-full p-4 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 hover:border-primary transition-colors cursor-pointer">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-muted-foreground">
                {uploadingSample ? 'Uploading...' : 'Add Sample'}
              </span>
            </button>}
        </div>
        <input ref={sampleInputRef} type="file" accept="audio/*" className="hidden" onChange={handleSampleUpload} />
      </div>

      {/* Media & Credibility Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <h2 className="font-display text-xl">Media & Credibility</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="past_gigs">Past Gigs</Label>
          <Textarea id="past_gigs" value={formData.past_gigs} onChange={e => setFormData({
          ...formData,
          past_gigs: e.target.value
        })} placeholder="The Troubadour - Jan 2024&#10;House of Blues - Dec 2023&#10;Whisky a Go Go - Nov 2023" rows={4} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="press_links">Press Links</Label>
          <Textarea id="press_links" value={formData.press_links} onChange={e => setFormData({
          ...formData,
          press_links: e.target.value
        })} placeholder="https://example.com/review&#10;https://blog.com/interview" rows={3} />
        </div>
      </div>

      {/* Account Information Section */}
      <AccountInformation />

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>;
}