
-- Create the storage bucket for chatbot training files if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
SELECT 'chatbot_training_files', 'chatbot_training_files', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'chatbot_training_files'
);

-- Set up storage policies for the bucket
INSERT INTO storage.policies (name, definition, bucket_id)
SELECT 
    'Allow public read access', 
    'bucket_id = ''chatbot_training_files''',
    'chatbot_training_files'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'chatbot_training_files' AND name = 'Allow public read access'
);

-- Allow users to upload their own files
INSERT INTO storage.policies (name, definition, bucket_id)
SELECT 
    'Allow authenticated users to upload', 
    '(bucket_id = ''chatbot_training_files'') AND (auth.role() = ''authenticated'')',
    'chatbot_training_files'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies 
    WHERE bucket_id = 'chatbot_training_files' AND name = 'Allow authenticated users to upload'
);
