import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
interface GigListing {
  id: string;
  gig_date: string;
  venue_listing_id: string;
  artist_id: string;
  venue_listing?: {
    venue_name: string;
    room_name: string | null;
  };
  artist_profile?: {
    band_name: string | null;
  };
  artist?: {
    first_name: string;
    last_name: string;
  };
}
export default function VenueCalendar() {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const [gigs, setGigs] = useState<GigListing[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user) {
      fetchGigs();
    }
  }, [user]);
  const fetchGigs = async () => {
    setLoading(true);

    // First get venue profile
    const {
      data: venueProfile
    } = await supabase.from('venue_profiles').select('id').eq('user_id', user!.id).single();
    if (!venueProfile) {
      setLoading(false);
      return;
    }

    // Get venue listings
    const {
      data: listings
    } = await supabase.from('venue_listings').select('id').eq('venue_profile_id', venueProfile.id);
    if (!listings || listings.length === 0) {
      setLoading(false);
      return;
    }
    const listingIds = listings.map(l => l.id);

    // Get gigs for these listings
    const {
      data: gigsData
    } = await supabase.from('gig_listings').select('*').in('venue_listing_id', listingIds).order('gig_date', {
      ascending: true
    });
    if (gigsData) {
      // Fetch additional data for each gig
      const enrichedGigs = await Promise.all(gigsData.map(async gig => {
        const [venueListingRes, artistProfileRes, artistRes] = await Promise.all([supabase.from('venue_listings').select('venue_name, room_name').eq('id', gig.venue_listing_id).single(), supabase.from('artist_profiles').select('band_name').eq('user_id', gig.artist_id).single(), supabase.from('profiles').select('first_name, last_name').eq('id', gig.artist_id).single()]);
        return {
          ...gig,
          venue_listing: venueListingRes.data,
          artist_profile: artistProfileRes.data,
          artist: artistRes.data
        };
      }));
      setGigs(enrichedGigs);
    }
    setLoading(false);
  };
  const gigDates = gigs.map(g => new Date(g.gig_date));
  const gigsOnSelectedDate = selectedDate ? gigs.filter(g => format(new Date(g.gig_date), 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')) : [];
  const modifiers = {
    hasGig: gigDates
  };
  const modifiersStyles = {
    hasGig: {
      backgroundColor: '#b0177f',
      color: 'white',
      borderRadius: '0'
    }
  };
  if (loading) {
    return <div className="space-y-6 animate-fade-in">
        <div className="h-8 w-48 bg-card animate-pulse" />
        <div className="h-64 bg-card animate-pulse" />
      </div>;
  }
  return <div className="space-y-6 animate-fade-in">
      

      <div className="grid md:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="bg-card border border-border p-4 flex items-center justify-center">
          <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} modifiers={modifiers} modifiersStyles={modifiersStyles} className="pointer-events-auto" />
        </div>

        {/* Events on selected date */}
        <div className="bg-card border border-border p-6">
          <h2 className="font-display text-sm text-primary tracking-widest mb-4">
            {selectedDate ? format(selectedDate, 'MMMM d, yyyy').toUpperCase() : 'SELECT A DATE'}
          </h2>
          
          {gigsOnSelectedDate.length === 0 ? <p className="text-muted-foreground text-sm">No events on this date</p> : <div className="space-y-3">
              {gigsOnSelectedDate.map(gig => {
            const artistName = gig.artist_profile?.band_name || `${gig.artist?.first_name} ${gig.artist?.last_name}`;
            const roomDisplay = gig.venue_listing?.room_name ? `${gig.venue_listing.room_name}` : gig.venue_listing?.venue_name;
            return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left bg-secondary p-4 hover:bg-secondary/80 transition-colors">
                    <p className="font-display text-lg text-accent">{artistName}</p>
                    <p className="text-sm text-muted-foreground">{roomDisplay}</p>
                  </button>;
          })}
            </div>}
        </div>
      </div>

      {/* Upcoming gigs list */}
      <div className="bg-card border border-border p-6">
        <h2 className="font-display text-sm text-primary tracking-widest mb-4">UPCOMING SHOWS</h2>
        {gigs.length === 0 ? <p className="text-muted-foreground text-sm">No upcoming shows booked</p> : <div className="space-y-2">
            {gigs.filter(g => new Date(g.gig_date) >= new Date()).map(gig => {
          const artistName = gig.artist_profile?.band_name || `${gig.artist?.first_name} ${gig.artist?.last_name}`;
          const roomDisplay = gig.venue_listing?.room_name ? `${gig.venue_listing.room_name}` : gig.venue_listing?.venue_name;
          return <button key={gig.id} onClick={() => navigate(`/venue/calendar/${gig.id}`)} className="w-full text-left flex items-center justify-between bg-secondary p-3 hover:bg-secondary/80 transition-colors">
                  <div>
                    <p className="font-display text-accent">{artistName}</p>
                    <p className="text-xs text-muted-foreground">{roomDisplay}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(gig.gig_date), 'MMM d, yyyy')}
                  </span>
                </button>;
        })}
          </div>}
      </div>
    </div>;
}