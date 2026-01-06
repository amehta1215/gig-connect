import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  sender?: { first_name: string; last_name: string };
}

export default function VenueMessages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (user) {
      fetchMessages();
    }
  }, [user]);

  const fetchMessages = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name)
      `)
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setMessages(data as Message[]);
    }
    setLoading(false);
  };

  const toggleStar = async (messageId: string, currentStarred: boolean) => {
    await supabase
      .from('messages')
      .update({ is_starred: !currentStarred })
      .eq('id', messageId);

    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, is_starred: !currentStarred } : m
    ));
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);

    setMessages(messages.map(m =>
      m.id === messageId ? { ...m, is_read: true } : m
    ));
  };

  const filteredMessages = messages.filter((message) =>
    message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${message.sender?.first_name} ${message.sender?.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.is_read) {
      markAsRead(message.id);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-gradient">Messages</h1>
        <p className="text-muted-foreground mt-1">Connect with artists</p>
      </div>

      <div className="flex h-[calc(100vh-280px)] min-h-[400px] border border-border rounded-xl overflow-hidden bg-card">
        {/* Message List */}
        <div className={`w-full md:w-1/3 border-r border-border flex flex-col ${
          selectedMessage ? 'hidden md:flex' : 'flex'
        }`}>
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No messages yet</p>
              </div>
            ) : (
              filteredMessages.map((message) => (
                <div
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`p-4 border-b border-border cursor-pointer transition-colors ${
                    selectedMessage?.id === message.id
                      ? 'bg-primary/10'
                      : message.is_read
                      ? 'hover:bg-secondary'
                      : 'bg-secondary/50 hover:bg-secondary'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {message.is_read ? (
                        <MailOpen className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mail className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${!message.is_read ? 'font-semibold' : ''}`}>
                          {message.sender?.first_name} {message.sender?.last_name}
                        </span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {format(new Date(message.created_at), 'MMM d')}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${!message.is_read ? 'font-medium' : 'text-muted-foreground'}`}>
                        {message.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {message.content}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStar(message.id, message.is_starred);
                      }}
                      className="flex-shrink-0 p-1 hover:bg-secondary rounded"
                    >
                      {message.is_starred ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Message Detail */}
        <div className={`flex-1 flex flex-col ${
          selectedMessage ? 'flex' : 'hidden md:flex'
        }`}>
          {selectedMessage ? (
            <>
              {/* Detail Header */}
              <div className="p-4 border-b border-border flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSelectedMessage(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <h2 className="font-semibold">{selectedMessage.subject || '(No subject)'}</h2>
                  <p className="text-sm text-muted-foreground">
                    From: {selectedMessage.sender?.first_name} {selectedMessage.sender?.last_name}
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedMessage.created_at), 'MMM d, yyyy h:mm a')}
                </span>
              </div>

              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Mail className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Select a message to read</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
