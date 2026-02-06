import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || query.length < 2) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Nominatim (OpenStreetMap) - free, no API key needed
    // Filter to cities, towns, villages, suburbs, neighbourhoods only
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10&countrycodes=us`;
    
    console.log("Nominatim request for:", query);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LovableApp/1.0'
      }
    });
    
    const data = await response.json();
    
    // Strictly filter to populated places only — no rivers, lakes, parks, buildings, peaks
    const allowedAddressTypes = ['city', 'town', 'village', 'suburb', 'neighbourhood', 'borough', 'state', 'county', 'municipality', 'township'];
    const filtered = data.filter((place: any) => {
      return allowedAddressTypes.includes(place.addresstype);
    });
    
    console.log("Nominatim response count:", data.length, "filtered:", filtered.length);

    const suggestions = filtered.slice(0, 5).map((place: any) => {
      // Build a cleaner display name: City/Neighborhood, State
      const addr = place.address || {};
      const primaryName = addr.neighbourhood || addr.suburb || addr.city || addr.town || addr.village || addr.county || place.display_name.split(',')[0];
      const state = addr.state || '';
      const displayName = state ? `${primaryName}, ${state}` : primaryName;
      
      return {
        id: place.place_id.toString(),
        name: displayName,
        text: displayName,
      };
    });

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Location search error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
