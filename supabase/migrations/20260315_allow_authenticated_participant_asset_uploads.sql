DROP POLICY IF EXISTS "participant_assets_authenticated_upload" ON storage.objects;

CREATE POLICY "participant_assets_authenticated_upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'participant-assets');
