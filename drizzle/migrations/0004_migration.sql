-- Hide emails: column-level read access on profiles
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, first_name, last_name, role, created_at, updated_at) ON public.profiles TO authenticated;

-- Message attachments: only sender/receiver can read
DROP POLICY IF EXISTS "Anyone can read message attachments" ON storage.objects;
CREATE POLICY "Message participants can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE (m.sender_id = auth.uid() OR m.receiver_id = auth.uid())
        AND m.attachments::text LIKE '%' || storage.objects.name || '%'
    )
  )
);