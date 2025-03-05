
-- Create the chatbot_settings table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_chatbot_settings_table_if_not_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  table_exists boolean;
BEGIN
  -- Check if the table already exists
  SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename = 'chatbot_settings'
  ) INTO table_exists;
  
  -- If the table doesn't exist, create it
  IF NOT table_exists THEN
    CREATE TABLE public.chatbot_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      settings JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
    
    -- Create indexes
    CREATE INDEX chatbot_settings_user_id_idx ON public.chatbot_settings (user_id);
    
    -- Set up RLS policies
    ALTER TABLE public.chatbot_settings ENABLE ROW LEVEL SECURITY;
    
    -- Users can only see their own settings
    CREATE POLICY "Users can view their own chatbot settings" 
      ON public.chatbot_settings FOR SELECT 
      USING (auth.uid() = user_id);
    
    -- Users can insert their own settings
    CREATE POLICY "Users can insert their own chatbot settings" 
      ON public.chatbot_settings FOR INSERT 
      WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own settings
    CREATE POLICY "Users can update their own chatbot settings" 
      ON public.chatbot_settings FOR UPDATE
      USING (auth.uid() = user_id);
    
    -- Create trigger for updated_at
    CREATE TRIGGER update_chatbot_settings_timestamp
    BEFORE UPDATE ON public.chatbot_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_chatbot_settings_table_if_not_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_chatbot_settings_table_if_not_exists() TO anon;
