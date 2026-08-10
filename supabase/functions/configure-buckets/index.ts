// One-off admin task: applies file size + MIME type limits to storage buckets.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKETS = [
  {
    id: "artist-media",
    file_size_limit: 5242880,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  {
    id: "venue-media",
    file_size_limit: 5242880,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  {
    id: "message-attachments",
    file_size_limit: 10485760,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"],
  },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const results: Record<string, unknown>[] = [];

  for (const bucket of BUCKETS) {
    const res = await fetch(`${url}/storage/v1/bucket/${bucket.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bucket.id,
        name: bucket.id,
        public: true,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types,
      }),
    });
    results.push({ bucket: bucket.id, status: res.status, body: await res.text() });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
