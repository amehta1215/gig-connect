import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, Save, Building2, Music } from 'lucide-react';

interface VenueProfileData {
  id: string;
  user_id: string;
  venue_name: string | null;
  location: string | null;
  bio: string | null;
  event_types: string[];
}

const eventTypeOptions = [
  { id: 'dj', label: 'DJ' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'live_music', label: 'Live Music' },
  { id: 'open_mic', label: 'Open Mic' },
  { id: 'karaoke', label: 'Karaoke' },
  { id: 'private_events', label: 'Private Events' },
];

export default function VenueProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<VenueProfileData | null>(null);

  const [formData, setFormData] = useState({
    venue_name: '',
    location: '',
    bio: '',
    event_types: [] as string[],
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('venue_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data && !error) {
      setProfile(data as VenueProfileData);
      setFormData({
        venue_name: data.venue_name || '',
        location: data.location || '',
        bio: data.bio || '',
        event_types: data.event_types || [],
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    const { error } = await supabase
      .from('venue_profiles')
      .update({
        venue_name: formData.venue_name || null,
        location: formData.location || null,
        bio: formData.bio || null,
        event_types: formData.event_types,
      })
      .eq('id', profile.id);

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile saved successfully');
    }
    setSaving(false);
  };

  const toggleEventType = (eventType: string) => {
    if (formData.event_types.includes(eventType)) {
      setFormData({
        ...formData,
        event_types: formData.event_types.filter(e => e !== eventType),
      });
    } else {
      setFormData({
        ...formData,
        event_types: [...formData.event_types, eventType],
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="font-display text-4xl text-gradient">Edit Venue Profile</h1>
          <p className="text-muted-foreground">Your venue's main profile</p>
        </div>
      </div>

      {/* Venue Info Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Building2 className="h-5 w-5" />
          <h2 className="font-display text-xl">Venue Info</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="venue_name">Venue Name</Label>
          <Input
            id="venue_name"
            value={formData.venue_name}
            onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
            placeholder="The Blue Note"
          />
        </div>

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
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Tell artists about your venue, its vibe, and what makes it special..."
            rows={4}
          />
        </div>
      </div>

      {/* Event Types Section */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-primary mb-4">
          <Music className="h-5 w-5" />
          <h2 className="font-display text-xl">Event Types</h2>
        </div>
        <p className="text-sm text-muted-foreground">Select the types of events you host</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {eventTypeOptions.map((option) => (
            <div
              key={option.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                formData.event_types.includes(option.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => toggleEventType(option.id)}
            >
              <Checkbox
                checked={formData.event_types.includes(option.id)}
                onCheckedChange={() => toggleEventType(option.id)}
              />
              <Label className="cursor-pointer">{option.label}</Label>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
}
