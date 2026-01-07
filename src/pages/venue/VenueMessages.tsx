import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, StarOff, Mail, MailOpen, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  thread_id: string;
  subject: string | null;
  content: string;
  is_read: boolean;
  is_starred: boolean;
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    artist_profiles: { band_name: string | null }[];
  };
  receiver?: {
    first_name: string;
    last_name: string;
    artist_profiles: { band_name: string | null }[];
  };
}
type FilterType = 'all' | 'unread' | 'starred';
type SortType = 'newest' | 'oldest';
export default function VenueMessages() {
  const {
    user
  } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);
  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('messages').select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, artist_profiles(band_name)),
        receiver:profiles!messages_receiver_id_fkey(first_name, last_name, artist_profiles(band_name))
      `).or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`).order('created_at', {
      ascending: false
    });
    if (data && !error) {
      setMessages(data as unknown as Message[]);
    }
    setLoading(false);
  };
  const toggleStar = async (messageId: string, currentStarred: boolean) => {
    await supabase.from('messages').update({
      is_starred: !currentStarred
    }).eq('id', messageId);
    setMessages(messages.map(m => m.id === messageId ? {
      ...m,
      is_starred: !currentStarred
    } : m));
  };
  const markAsRead = async (messageId: string) => {
    await supabase.from('messages').update({
      is_read: true
    }).eq('id', messageId);
    setMessages(messages.map(m => m.id === messageId ? {
      ...m,
      is_read: true
    } : m));
  };
  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || message.content.toLowerCase().includes(searchTerm.toLowerCase()) || `${message.sender?.first_name} ${message.sender?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'unread') return matchesSearch && !message.is_read;
    if (filter === 'starred') return matchesSearch && message.is_starred;
    return matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });
  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };
  const unreadCount = messages.filter(m => !m.is_read).length;
  return <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <h1 className="font-display section-title text-accent font-bold">MESSAGES</h1>

      <div className="flex h-[calc(100vh-220px)] min-h-[400px] border border-border overflow-hidden bg-card">
        {/* Message List */}
        <div className={`w-full md:w-1/3 border-r border-border flex flex-col ${selectedMessage ? 'hidden md:flex' : 'flex'}`}>
          {/* Search & Filters */}
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-background border-border" />
            </div>
            <div className="flex gap-2">
              <Select value={filter} onValueChange={v => setFilter(v as FilterType)}>
                <SelectTrigger className="flex-1 h-8 text-xs bg-background border-border">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread {unreadCount > 0 && `(${unreadCount})`}</SelectItem>
                  <SelectItem value="starred">Starred</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={v => setSortBy(v as SortType)}>
                <SelectTrigger className="flex-1 h-8 text-xs bg-background border-border">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary animate-pulse" />)}
              </div> : filteredMessages.length === 0 ? <div className="p-8 text-center">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">Empty</p>
              </div> : filteredMessages.map(message => {
                const isSent = message.sender_id === user?.id;
                const recipientBandName = message.receiver?.artist_profiles?.[0]?.band_name;
                const senderBandName = message.sender?.artist_profiles?.[0]?.band_name;
                const displayName = isSent 
                  ? `To: ${message.receiver?.first_name} ${message.receiver?.last_name}${recipientBandName ? ` (${recipientBandName})` : ''}`
                  : `${message.sender?.first_name} ${message.sender?.last_name}${senderBandName ? ` (${senderBandName})` : ''}`;
                return (
                  <div key={message.id} onClick={() => handleSelectMessage(message)} className={`p-3 border-b border-border cursor-pointer transition-colors ${selectedMessage?.id === message.id ? 'bg-primary/10' : message.is_read ? 'hover:bg-secondary' : 'bg-secondary/50 hover:bg-secondary'}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        {message.is_read ? <MailOpen className="h-4 w-4 text-muted-foreground" /> : <Mail className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${!message.is_read && !isSent ? 'font-semibold' : ''}`}>
                            {displayName}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 uppercase tracking-wider">
                            {format(new Date(message.created_at), 'MMM d')}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${!message.is_read && !isSent ? 'font-medium' : 'text-muted-foreground'}`}>
                          {message.subject || '(No subject)'}
                        </p>
                      </div>
                      <button onClick={e => {
                        e.stopPropagation();
                        toggleStar(message.id, message.is_starred);
                      }} className="flex-shrink-0 p-1 hover:bg-secondary">
                        {message.is_starred ? <Star className="h-4 w-4 text-primary fill-primary" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Message Detail */}
        <div className={`flex-1 flex flex-col ${selectedMessage ? 'flex' : 'hidden md:flex'}`}>
          {selectedMessage ? <>
              {/* Detail Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedMessage(null)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <h2 className="font-display text-lg tracking-wide">{selectedMessage.subject || '(No subject)'}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedMessage.sender_id === user?.id 
                      ? `To: ${selectedMessage.receiver?.first_name} ${selectedMessage.receiver?.last_name}${selectedMessage.receiver?.artist_profiles?.[0]?.band_name ? ` (${selectedMessage.receiver.artist_profiles[0].band_name})` : ''}`
                      : `From: ${selectedMessage.sender?.first_name} ${selectedMessage.sender?.last_name}${selectedMessage.sender?.artist_profiles?.[0]?.band_name ? ` (${selectedMessage.sender.artist_profiles[0].band_name})` : ''}`}
                  </p>
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {format(new Date(selectedMessage.created_at), 'MMM d, yyyy')}
                </span>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <p className="whitespace-pre-wrap text-sm">{selectedMessage.content}</p>
              </div>
            </> : <div className="flex-1 flex items-center justify-center">
              <Mail className="h-12 w-12 text-muted-foreground/30" />
            </div>}
        </div>
      </div>
    </div>;
}