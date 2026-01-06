import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCircle2, Archive, MapPin, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  artist_id: string;
  venue_listing_id: string;
  status: 'in_progress' | 'accepted' | 'archived';
  message: string | null;
  created_at: string;
  venue_listing?: {
    venue_name: string;
    room_name: string | null;
    location: string | null;
  };
}

export default function ArtistApplications() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('in_progress');

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        venue_listing:venue_listings(venue_name, room_name, location)
      `)
      .eq('artist_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setApplications(data as Application[]);
    }
    setLoading(false);
  };

  const filteredApplications = applications.filter((app) => app.status === activeTab);

  const statusConfig = {
    in_progress: {
      icon: Clock,
      label: 'In Progress',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    accepted: {
      icon: CheckCircle2,
      label: 'Accepted',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    archived: {
      icon: Archive,
      label: 'Archived',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  };

  const ApplicationCard = ({ application }: { application: Application }) => {
    const config = statusConfig[application.status];
    const StatusIcon = config.icon;

    return (
      <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-display text-xl text-foreground">
              {application.venue_listing?.venue_name}
            </h3>
            {application.venue_listing?.room_name && (
              <p className="text-sm text-muted-foreground">
                {application.venue_listing.room_name}
              </p>
            )}
            {application.venue_listing?.location && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {application.venue_listing.location}
              </p>
            )}
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm ${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-4 w-4" />
            {config.label}
          </div>
        </div>
        
        {application.message && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {application.message}
          </p>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-4">
          <Calendar className="h-3 w-3" />
          Applied {format(new Date(application.created_at), 'MMM d, yyyy')}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl text-gradient">Applications</h1>
        <p className="text-muted-foreground mt-1">Track your venue applications</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="in_progress" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="h-4 w-4 mr-2" />
            In Progress
          </TabsTrigger>
          <TabsTrigger value="accepted" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accepted
          </TabsTrigger>
          <TabsTrigger value="archived" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Archive className="h-4 w-4 mr-2" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-card rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <div className="w-16 h-16 mx-auto bg-secondary rounded-full flex items-center justify-center mb-4">
                {activeTab === 'in_progress' && <Clock className="h-8 w-8 text-muted-foreground" />}
                {activeTab === 'accepted' && <CheckCircle2 className="h-8 w-8 text-muted-foreground" />}
                {activeTab === 'archived' && <Archive className="h-8 w-8 text-muted-foreground" />}
              </div>
              <h3 className="font-display text-2xl mb-2">No {activeTab.replace('_', ' ')} applications</h3>
              <p className="text-muted-foreground">
                {activeTab === 'in_progress'
                  ? 'Start applying to venues to see them here'
                  : activeTab === 'accepted'
                  ? 'Accepted applications will appear here'
                  : 'Archived applications will appear here'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApplications.map((application) => (
                <ApplicationCard key={application.id} application={application} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
