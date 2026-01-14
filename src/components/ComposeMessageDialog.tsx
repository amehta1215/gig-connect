import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Artist {
  id: string;
  name: string;
  bandName: string | null;
}

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ComposeMessageDialog({ open, onOpenChange, onSuccess }: ComposeMessageDialogProps) {
  const { user } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch artists who have applied to this venue
  useEffect(() => {
    if (open && user) {
      fetchApplicantArtists();
    }
  }, [open, user]);

  const fetchApplicantArtists = async () => {
    if (!user) return;
    setLoading(true);

    // First get the venue's listings
    const { data: venueProfile } = await supabase
      .from('venue_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!venueProfile) {
      setLoading(false);
      return;
    }

    const { data: listings } = await supabase
      .from('venue_listings')
      .select('id')
      .eq('venue_profile_id', venueProfile.id);

    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }

    const listingIds = listings.map(l => l.id);

    // Get all applications to these listings with artist info
    const { data: applications } = await supabase
      .from('applications')
      .select(`
        artist_id,
        artist:profiles!applications_artist_id_fkey(id, first_name, last_name)
      `)
      .in('venue_listing_id', listingIds);

    if (applications) {
      // Get unique artist IDs
      const artistIds = [...new Set(applications.map(app => app.artist_id))];
      
      // Fetch artist profiles separately
      const { data: artistProfiles } = await supabase
        .from('artist_profiles')
        .select('user_id, band_name')
        .in('user_id', artistIds);

      const profileMap = new Map(artistProfiles?.map(p => [p.user_id, p.band_name]) || []);

      // Deduplicate artists
      const artistMap = new Map<string, Artist>();
      applications.forEach(app => {
        if (app.artist && !artistMap.has(app.artist_id)) {
          artistMap.set(app.artist_id, {
            id: app.artist_id,
            name: `${app.artist.first_name} ${app.artist.last_name}`,
            bandName: profileMap.get(app.artist_id) || null,
          });
        }
      });
      setArtists(Array.from(artistMap.values()));
    }
    setLoading(false);
  };

  const filteredArtists = artists.filter(artist => {
    const search = searchTerm.toLowerCase();
    return (
      artist.name.toLowerCase().includes(search) ||
      (artist.bandName && artist.bandName.toLowerCase().includes(search))
    );
  });

  const handleSelectArtist = (artist: Artist) => {
    setSelectedArtist(artist);
    setSearchTerm(artist.bandName || artist.name);
    setShowDropdown(false);
  };

  const clearSelection = () => {
    setSelectedArtist(null);
    setSearchTerm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArtist || !content.trim() || !user) return;

    setSending(true);
    const threadId = crypto.randomUUID();

    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      subject: subject.trim() || null,
      content: content.trim(),
      sender_id: user.id,
      receiver_id: selectedArtist.id,
    });

    if (error) {
      toast.error('Failed to send message');
    } else {
      toast.success('Message sent');
      // Reset form
      setSelectedArtist(null);
      setSearchTerm('');
      setSubject('');
      setContent('');
      onOpenChange(false);
      onSuccess();
    }
    setSending(false);
  };

  const handleClose = () => {
    setSelectedArtist(null);
    setSearchTerm('');
    setSubject('');
    setContent('');
    setShowDropdown(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wide">NEW MESSAGE</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Artist Search */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">To</Label>
            <div className="relative">
              {selectedArtist ? (
                <div className="flex items-center gap-2 p-2 bg-secondary border border-border">
                  <span className="flex-1 text-sm">
                    {selectedArtist.bandName || selectedArtist.name}
                    {selectedArtist.bandName && (
                      <span className="text-muted-foreground ml-1">({selectedArtist.name})</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="p-1 hover:bg-background/50 transition-colors"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search artists who applied..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="pl-10 bg-background border-border"
                  />
                  {showDropdown && searchTerm && (
                    <div className="absolute z-50 w-full mt-1 bg-card border border-border shadow-lg max-h-48 overflow-y-auto">
                      {loading ? (
                        <div className="p-3 text-sm text-muted-foreground">Loading...</div>
                      ) : filteredArtists.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">No artists found</div>
                      ) : (
                        filteredArtists.map((artist) => (
                          <button
                            key={artist.id}
                            type="button"
                            onClick={() => handleSelectArtist(artist)}
                            className="w-full p-3 text-left hover:bg-secondary transition-colors border-b border-border last:border-b-0"
                          >
                            <span className="font-medium">
                              {artist.bandName || artist.name}
                            </span>
                            {artist.bandName && (
                              <span className="text-sm text-muted-foreground ml-2">
                                ({artist.name})
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subject</Label>
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Message Content */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Message</Label>
            <Textarea
              placeholder="Write your message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] bg-background border-border resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !selectedArtist || !content.trim()}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
