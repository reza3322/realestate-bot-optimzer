
-- Create table for storing chatbot training data (Q&A pairs)
CREATE TABLE IF NOT EXISTS public.chatbot_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 0,
  content_type TEXT NOT NULL DEFAULT 'qa',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for storing chatbot training files (extracted text from documents)
CREATE TABLE IF NOT EXISTS public.chatbot_training_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_file TEXT NOT NULL,
  extracted_text TEXT NOT NULL,
  category TEXT DEFAULT 'File Import',
  priority INTEGER DEFAULT 5,
  content_type TEXT NOT NULL,
  processing_status TEXT DEFAULT 'complete',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for storing chatbot conversations
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  visitor_id TEXT,
  conversation_id TEXT,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS and create policies for chatbot_training_data
ALTER TABLE public.chatbot_training_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training data"
  ON public.chatbot_training_data
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training data"
  ON public.chatbot_training_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training data"
  ON public.chatbot_training_data
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training data"
  ON public.chatbot_training_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS and create policies for chatbot_training_files
ALTER TABLE public.chatbot_training_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own training files"
  ON public.chatbot_training_files
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training files"
  ON public.chatbot_training_files
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training files"
  ON public.chatbot_training_files
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training files"
  ON public.chatbot_training_files
  FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS and create policies for chatbot_conversations
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON public.chatbot_conversations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can insert conversations"
  ON public.chatbot_conversations
  FOR INSERT
  WITH CHECK (true);

-- Create the function to calculate text similarity for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Allow demo user access
CREATE POLICY "Service access to demo user conversations"
  ON public.chatbot_conversations
  FOR SELECT
  USING (user_id = 'demo-user');
