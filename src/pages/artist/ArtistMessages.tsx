import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Star, StarOff, Mail, MailOpen, ChevronLeft, Reply } from 'lucide-react';
import { format } from 'date-fns';
import { MessageReplyForm } from '@/components/MessageReplyForm';
import { FormattedMessageContent } from '@/components/FormattedMessageContent';
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
    venue_profiles: {
      venue_name: string | null;
    } | null;
  };
  receiver?: {
    first_name: string;
    last_name: string;
    venue_profiles: {
      venue_name: string | null;
    } | null;
  };
}
interface Thread {
  thread_id: string;
  messages: Message[];
  latestMessage: Message;
  hasUnread: boolean;
  isStarred: boolean;
  otherParty: {
    id: string;
    name: string;
    venueName?: string;
  };
}
type FilterType = 'all' | 'unread' | 'starred';
type SortType = 'newest' | 'oldest';
export default function ArtistMessages() {
  const {
    user
  } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [showReplyForm, setShowReplyForm] = useState(false);
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
        sender:profiles!messages_sender_id_fkey(first_name, last_name, venue_profiles(venue_name)),
        receiver:profiles!messages_receiver_id_fkey(first_name, last_name, venue_profiles(venue_name))
      `).or(`receiver_id.eq.${user.id},sender_id.eq.${user.id}`).order('created_at', {
      ascending: true
    });
    if (data && !error) {
      setMessages(data as unknown as Message[]);
    }
    setLoading(false);
  };

  // Group messages by thread
  const threads = useMemo(() => {
    const threadMap = new Map<string, Message[]>();
    messages.forEach(message => {
      const existing = threadMap.get(message.thread_id) || [];
      threadMap.set(message.thread_id, [...existing, message]);
    });
    const threadList: Thread[] = [];
    threadMap.forEach((threadMessages, threadId) => {
      const sortedMessages = threadMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const latestMessage = sortedMessages[sortedMessages.length - 1];
      const firstMessage = sortedMessages[0];

      // Find the other party (not the current user)
      const otherPartyMessage = sortedMessages.find(m => m.sender_id !== user?.id) || firstMessage;
      const isOtherPartySender = otherPartyMessage.sender_id !== user?.id;
      const otherParty = isOtherPartySender ? {
        id: otherPartyMessage.sender_id,
        name: `${otherPartyMessage.sender?.first_name} ${otherPartyMessage.sender?.last_name}`,
        venueName: otherPartyMessage.sender?.venue_profiles?.venue_name || undefined
      } : {
        id: otherPartyMessage.receiver_id,
        name: `${otherPartyMessage.receiver?.first_name} ${otherPartyMessage.receiver?.last_name}`,
        venueName: otherPartyMessage.receiver?.venue_profiles?.venue_name || undefined
      };
      threadList.push({
        thread_id: threadId,
        messages: sortedMessages,
        latestMessage,
        hasUnread: sortedMessages.some(m => !m.is_read && m.receiver_id === user?.id),
        isStarred: sortedMessages.some(m => m.is_starred),
        otherParty
      });
    });
    return threadList;
  }, [messages, user?.id]);
  const toggleStar = async (threadId: string, currentStarred: boolean) => {
    const thread = threads.find(t => t.thread_id === threadId);
    if (!thread) return;

    // Toggle star on the latest message in the thread
    await supabase.from('messages').update({
      is_starred: !currentStarred
    }).eq('id', thread.latestMessage.id);
    setMessages(messages.map(m => m.id === thread.latestMessage.id ? {
      ...m,
      is_starred: !currentStarred
    } : m));
  };
  const markThreadAsRead = async (threadId: string) => {
    const thread = threads.find(t => t.thread_id === threadId);
    if (!thread) return;
    const unreadIds = thread.messages.filter(m => !m.is_read && m.receiver_id === user?.id).map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('messages').update({
        is_read: true
      }).in('id', unreadIds);
      setMessages(messages.map(m => unreadIds.includes(m.id) ? {
        ...m,
        is_read: true
      } : m));
    }
  };
  const filteredThreads = threads.filter(thread => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSubject = thread.messages.some(m => m.subject?.toLowerCase().includes(searchLower));
    const matchesContent = thread.messages.some(m => m.content.toLowerCase().includes(searchLower));
    const matchesName = thread.otherParty.name.toLowerCase().includes(searchLower);
    const matchesVenueName = thread.otherParty.venueName?.toLowerCase().includes(searchLower);
    const matchesSearch = !searchTerm || matchesSubject || matchesContent || matchesName || matchesVenueName;
    
    if (filter === 'unread') return matchesSearch && thread.hasUnread;
    if (filter === 'starred') return matchesSearch && thread.isStarred;
    return matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.latestMessage.created_at).getTime();
    const dateB = new Date(b.latestMessage.created_at).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });
  const selectedThread = threads.find(t => t.thread_id === selectedThreadId);
  const handleSelectThread = (thread: Thread) => {
    setSelectedThreadId(thread.thread_id);
    setShowReplyForm(false);
    markThreadAsRead(thread.thread_id);
  };
  const unreadCount = threads.filter(t => t.hasUnread).length;

  // Highlight search term in text
  const highlightText = (text: string) => {
    if (!searchTerm.trim()) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-primary/20 text-foreground rounded-sm px-0.5">{part}</mark>
      ) : part
    );
  };

  // Get the base subject (without Re: prefix)
  const getBaseSubject = (thread: Thread) => {
    const firstMessage = thread.messages[0];
    return firstMessage.subject?.replace(/^Re:\s*/i, '') || '(No subject)';
  };
  return <div className="space-y-6 animate-fade-in">
      

      <div className="flex h-[calc(100vh-220px)] min-h-[400px] border border-border overflow-hidden bg-card">
        {/* Thread List */}
        <div className={`w-full md:w-1/3 border-r border-border flex flex-col ${selectedThreadId ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search mail..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-background border-border" />
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

          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="p-3 space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-secondary animate-pulse" />)}
              </div> : filteredThreads.length === 0 ? <div className="p-8 text-center">
                <Mail className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
              </div> : filteredThreads.map(thread => {
            const displayName = `${thread.otherParty.name}${thread.otherParty.venueName ? ` (${thread.otherParty.venueName})` : ''}`;
            const messageCount = thread.messages.length;
            return <div key={thread.thread_id} onClick={() => handleSelectThread(thread)} className={`p-3 border-b border-border cursor-pointer transition-colors ${selectedThreadId === thread.thread_id ? 'bg-primary/10' : thread.hasUnread ? 'bg-secondary/50 hover:bg-secondary' : 'hover:bg-secondary'}`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-shrink-0 mt-1">
                        {thread.hasUnread ? <Mail className="h-4 w-4 text-primary" /> : <MailOpen className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${thread.hasUnread ? 'font-semibold' : ''}`}>
                            {highlightText(displayName)}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0 uppercase tracking-wider">
                            {format(new Date(thread.latestMessage.created_at), 'MMM d')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate flex-1 ${thread.hasUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                            {highlightText(getBaseSubject(thread))}
                          </p>
                          {messageCount > 1 && <span className="text-[10px] text-muted-foreground">({messageCount})</span>}
                        </div>
                      </div>
                      <button onClick={e => {
                  e.stopPropagation();
                  toggleStar(thread.thread_id, thread.isStarred);
                }} className="flex-shrink-0 p-1 hover:bg-secondary">
                        {thread.isStarred ? <Star className="h-4 w-4 text-primary fill-primary" /> : <StarOff className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>;
          })}
          </div>
        </div>

        {/* Thread Detail */}
        <div className={`flex-1 flex flex-col ${selectedThreadId ? 'flex' : 'hidden md:flex'}`}>
          {selectedThread ? <>
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedThreadId(null)}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <h2 className="font-display text-lg tracking-wide">{getBaseSubject(selectedThread)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedThread.otherParty.name}
                    {selectedThread.otherParty.venueName && ` (${selectedThread.otherParty.venueName})`}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedThread.messages.map(message => {
              const isSent = message.sender_id === user?.id;
              const senderName = isSent ? 'You' : `${message.sender?.first_name} ${message.sender?.last_name}`;
              return <div key={message.id} className={`${isSent ? 'ml-8' : 'mr-8'}`}>
                      <div className={`p-4 rounded-lg ${isSent ? 'bg-primary/10' : 'bg-secondary'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium">{senderName}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {format(new Date(message.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <FormattedMessageContent content={message.content} />
                      </div>
                    </div>;
            })}
              </div>

              {showReplyForm ? <MessageReplyForm threadId={selectedThread.thread_id} originalSubject={selectedThread.latestMessage.subject} senderId={user?.id || ''} receiverId={selectedThread.otherParty.id} onSuccess={() => {
            setShowReplyForm(false);
            fetchMessages();
          }} onCancel={() => setShowReplyForm(false)} /> : <div className="border-t border-border p-4">
                  <Button onClick={() => setShowReplyForm(true)} className="w-full">
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                </div>}
            </> : <div className="flex-1 flex items-center justify-center">
              <Mail className="h-12 w-12 text-muted-foreground/30" />
            </div>}
        </div>
      </div>
    </div>;
}