const BUCKETS = [
  { id: "artist-media", file_size_limit: 20971520, allowed_mime_types: ["image/jpeg","image/png","image/webp","image/gif","audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/mp4","audio/x-m4a","audio/aac","audio/ogg","audio/flac","audio/webm"] },
  { id: "venue-media", file_size_limit: 5242880, allowed_mime_types: ["image/jpeg","image/png","image/webp","image/gif"] },
  { id: "message-attachments", file_size_limit: 10485760, allowed_mime_types: ["image/jpeg","image/png","image/webp","image/gif","application/pdf"] },
];
Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const results: unknown[] = [];
  for (const b of BUCKETS) {
    const res = await fetch(`${url}/storage/v1/bucket/${b.id}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ id: b.id, name: b.id, public: true, file_size_limit: b.file_size_limit, allowed_mime_types: b.allowed_mime_types }),
    });
    results.push({ bucket: b.id, status: res.status, body: await res.text() });
  }
  return new Response(JSON.stringify({ results }), { headers: { "Content-Type": "application/json" } });
});
