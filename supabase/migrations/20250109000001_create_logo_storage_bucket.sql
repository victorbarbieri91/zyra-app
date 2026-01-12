-- ============================================================================
-- MIGRATION: Create logos storage bucket for escritorio logos
-- ============================================================================

BEGIN;

-- Create logos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true, -- Public bucket for logo access
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Create RLS policies for logos bucket
DO $$
BEGIN
  -- Allow authenticated users to upload logos for their escritorio
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to upload logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload logos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'logos');
  END IF;

  -- Allow authenticated users to update their own logos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to update logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to update logos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'logos');
  END IF;

  -- Allow public to view logos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow public to view logos'
  ) THEN
    CREATE POLICY "Allow public to view logos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'logos');
  END IF;

  -- Allow authenticated users to delete their own logos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname = 'Allow authenticated users to delete logos'
  ) THEN
    CREATE POLICY "Allow authenticated users to delete logos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'logos');
  END IF;
END $$;

COMMIT;