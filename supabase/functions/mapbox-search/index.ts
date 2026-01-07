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
        JSON.stringify({ features: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = Deno.env.get("MAPBOX_PUBLIC_TOKEN");
    if (!accessToken) {
      throw new Error("Mapbox token not configured");
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&types=place,locality,neighborhood,region&limit=5&country=us`;
    
    console.log("Mapbox request URL (without token):", url.split('?')[0]);
    console.log("Query:", query);

    const response = await fetch(url);
    const data = await response.json();
    
    console.log("Mapbox response status:", response.status);
    console.log("Mapbox features count:", data.features?.length || 0);
    
    if (data.message) {
      console.error("Mapbox API error:", data.message);
      throw new Error(data.message);
    }

    const suggestions = data.features?.map((f: any) => ({
      id: f.id,
      name: f.place_name,
      text: f.text,
    })) || [];

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Mapbox search error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
