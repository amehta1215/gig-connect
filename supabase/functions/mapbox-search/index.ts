import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Suggestion {
  id: string;
  name: string;
  text: string;
}

const dedupe = (items: Suggestion[]) => {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const item of items) {
    const key = item.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

// Photon (OpenStreetMap based) is designed for type-ahead search, so it handles
// partial words like "Los Ang" that Nominatim returns nothing for.
const searchPhoton = async (query: string): Promise<Suggestion[]> => {
  const layers = ["city", "district", "locality", "county", "state"]
    .map((l) => `&layer=${l}`)
    .join("");
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=15&lang=en${layers}`;

  const response = await fetch(url, { headers: { "User-Agent": "SetHound/1.0" } });
  if (!response.ok) throw new Error(`Photon HTTP ${response.status}`);
  const data = await response.json();

  const features = Array.isArray(data?.features) ? data.features : [];
  const suggestions: Suggestion[] = [];

  for (const feature of features) {
    const p = feature?.properties || {};
    if (p.countrycode && p.countrycode !== "US") continue;
    const primary = p.name;
    if (!primary) continue;
    const state = p.state || "";
    const text = state && state !== primary ? `${primary}, ${state}` : primary;
    suggestions.push({
      id: String(p.osm_id ?? `${primary}-${state}`),
      name: text,
      text,
    });
  }

  return dedupe(suggestions).slice(0, 6);
};

const searchNominatim = async (query: string): Promise<Suggestion[]> => {
  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}` +
    `&format=json&addressdetails=1&limit=10&countrycodes=us`;

  const response = await fetch(url, { headers: { "User-Agent": "SetHound/1.0" } });
  if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);

  // Nominatim serves an HTML/XML error page when it rate limits, so never assume JSON.
  const body = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error("Nominatim returned a non-JSON response");
  }
  if (!Array.isArray(data)) return [];

  const allowed = [
    "city", "town", "village", "suburb", "neighbourhood", "borough",
    "state", "county", "municipality", "township", "hamlet",
  ];

  const places = (data as Record<string, any>[]).filter((place) => {
    if (place.addresstype && allowed.includes(place.addresstype)) return true;
    // Fall back to the broader class so real cities aren't dropped on type mismatches.
    return place.class === "place" || place.class === "boundary";
  });

  const suggestions: Suggestion[] = places.map((place) => {
    const addr = place.address || {};
    const primary = addr.city || addr.town || addr.village || addr.neighbourhood ||
      addr.suburb || addr.county || String(place.display_name || "").split(",")[0];
    const state = addr.state || "";
    const text = state && state !== primary ? `${primary}, ${state}` : primary;
    return { id: String(place.place_id), name: text, text };
  }).filter((s) => !!s.text);

  return dedupe(suggestions).slice(0, 6);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { query } = await req.json();
    if (!query || String(query).trim().length < 2) {
      return json({ suggestions: [] });
    }
    const q = String(query).trim();

    const providers = [searchPhoton, searchNominatim];
    for (const provider of providers) {
      try {
        const suggestions = await provider(q);
        if (suggestions.length > 0) return json({ suggestions });
      } catch (err) {
        console.error("Location provider failed:", err instanceof Error ? err.message : err);
      }
    }

    return json({ suggestions: [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Location search error:", message);
    // Return an empty list instead of a 500 so the input stays usable.
    return json({ suggestions: [], error: message });
  }
});
