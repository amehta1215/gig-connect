import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const {
    user
  } = useAuth();
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
    const {
      data,
      error
    } = await supabase.from('applications').select(`
        *,
        venue_listing:venue_listings(venue_name, room_name, location)
      `).eq('artist_id', user.id).order('created_at', {
      ascending: false
    });
    if (data && !error) {
      setApplications(data as Application[]);
    }
    setLoading(false);
  };
  const filteredApplications = applications.filter(app => app.status === activeTab);
  const statusConfig = {
    in_progress: {
      icon: Clock,
      label: 'PENDING',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
    accepted: {
      icon: CheckCircle2,
      label: 'ACCEPTED',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    archived: {
      icon: Archive,
      label: 'ARCHIVED',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted'
    }
  };
  const ApplicationCard = ({
    application
  }: {
    application: Application;
  }) => {
    const config = statusConfig[application.status];
    const StatusIcon = config.icon;
    return <div className="bg-card border border-border p-4 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => navigate(`/artist/applications/${application.id}`)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="font-display text-xl text-foreground tracking-wide">
              {application.venue_listing?.venue_name}
            </h3>
            {application.venue_listing?.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {application.venue_listing.location}
              </p>}
          </div>
          <div className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-display tracking-wider ${config.bgColor} ${config.color}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-3 uppercase tracking-wider">
          <Calendar className="h-3 w-3" />
          {format(new Date(application.created_at), 'MMM d, yyyy')}
        </div>
      </div>;
  };
  return <div className="space-y-6 animate-fade-in">
      {/* Header */}
      

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border p-0 h-auto">
          <TabsTrigger value="in_progress" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            PENDING
          </TabsTrigger>
          <TabsTrigger value="accepted" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            ACCEPTED
          </TabsTrigger>
          <TabsTrigger value="archived" className="font-display tracking-widest text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none px-4 py-2">
            ARCHIVED
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card animate-pulse" />)}
            </div> : filteredApplications.length === 0 ? <div className="text-center py-16 bg-card border border-border">
              <h3 className="font-display text-xl text-muted-foreground">NO APPLICATIONS YET</h3>
            </div> : <div className="space-y-3">
              {filteredApplications.map(application => <ApplicationCard key={application.id} application={application} />)}
            </div>}
        </TabsContent>
      </Tabs>
    </div>;
}