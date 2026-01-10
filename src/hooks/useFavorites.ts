import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useFavorites() {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('artist_favorites')
      .select('venue_listing_id')
      .eq('artist_id', user.id);

    if (data && !error) {
      setFavoriteIds(new Set(data.map((f) => f.venue_listing_id)));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (venueListingId: string) => {
    if (!user) return;

    const isFavorited = favoriteIds.has(venueListingId);

    if (isFavorited) {
      // Remove from favorites
      const { error } = await supabase
        .from('artist_favorites')
        .delete()
        .eq('artist_id', user.id)
        .eq('venue_listing_id', venueListingId);

      if (!error) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(venueListingId);
          return next;
        });
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from('artist_favorites')
        .insert({
          artist_id: user.id,
          venue_listing_id: venueListingId,
        });

      if (!error) {
        setFavoriteIds((prev) => new Set(prev).add(venueListingId));
      }
    }
  };

  const isFavorite = (venueListingId: string) => favoriteIds.has(venueListingId);

  return {
    favoriteIds,
    loading,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites,
  };
}
