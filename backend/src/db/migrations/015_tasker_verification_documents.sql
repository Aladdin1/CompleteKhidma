-- Add verification document columns for tasker ID photos and criminal record
ALTER TABLE user_verifications
  ADD COLUMN IF NOT EXISTS id_photo_front_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_photo_back_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS criminal_record_id UUID REFERENCES media_files(id) ON DELETE SET NULL;

COMMENT ON COLUMN user_verifications.id_photo_front_id IS 'Media file ID for ID card front photo';
COMMENT ON COLUMN user_verifications.id_photo_back_id IS 'Media file ID for ID card back photo';
COMMENT ON COLUMN user_verifications.criminal_record_id IS 'Media file ID for criminal record document';
