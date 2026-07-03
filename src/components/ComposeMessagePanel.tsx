import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Send, Search, X, ChevronLeft, Paperclip, File, Image } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateThreadId } from '@/lib/messaging';

interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Artist {
  id: string;
  name: string;
  bandName: string | null;
}

interface ComposeMessagePanelProps {
  onSuccess: () => void;
  onClose: () => void;
  initialArtist?: Artist | null;
  initialSubject?: string;
}

export function ComposeMessagePanel({ onSuccess, onClose, initialArtist, initialSubject }: ComposeMessagePanelProps) {
  const { user } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialArtist?.bandName || initialArtist?.name || '');
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(initialArtist || null);
  const [subject, setSubject] = useState(initialSubject || '');
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch artists who have applied to this venue
  useEffect(() => {
    if (user) {
      fetchApplicantArtists();
    }
  }, [user]);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setUploading(true);
    const newAttachments: Attachment[] = [];

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('message-attachments')
        .upload(fileName, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(fileName);

      newAttachments.push({
        name: file.name,
        url: publicUrl,
        type: file.type,
        size: file.size,
      });
    }

    setAttachments([...attachments, ...newAttachments]);
    setUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageType = (type: string) => type.startsWith('image/');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArtist || (!content.trim() && attachments.length === 0) || !user) return;

    setSending(true);
    const threadId = await getOrCreateThreadId(user.id, selectedArtist.id);

    const { error } = await supabase.from('messages').insert({
      thread_id: threadId,
      subject: subject.trim() || null,
      content: content.trim(),
      sender_id: user.id,
      receiver_id: selectedArtist.id,
      attachments: attachments.length > 0 ? JSON.stringify(attachments) : '[]',
    } as any);

    if (error) {
      toast.error('Failed to send message');
    } else {
      toast.success('Message sent');
      setSelectedArtist(null);
      setSearchTerm('');
      setSubject('');
      setContent('');
      setAttachments([]);
      onSuccess();
      onClose();
    }
    setSending(false);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="font-display text-lg tracking-wide">NEW MESSAGE</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 space-y-4">
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
                  placeholder="Search artists who have applied to your venue"
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
        <div className="space-y-2 flex-1 flex flex-col">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Message</Label>
          <Textarea
            placeholder="Write your message..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 min-h-[120px] bg-background border-border resize-none"
          />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-secondary px-2 py-1 text-xs border border-border"
              >
                {isImageType(attachment.type) ? (
                  <Image className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <File className="h-3 w-3 text-muted-foreground" />
                )}
                <span className="max-w-[120px] truncate">{attachment.name}</span>
                <span className="text-muted-foreground">({formatFileSize(attachment.size)})</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  className="p-0.5 hover:bg-background/50 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-muted-foreground hover:text-foreground"
            >
              <Paperclip className="h-4 w-4 mr-1" />
              {uploading ? 'Uploading...' : 'Attach'}
            </Button>
          </div>
          <Button type="submit" disabled={sending || !selectedArtist || (!content.trim() && attachments.length === 0)}>
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
