
-- Function to search training data with similarity matching
CREATE OR REPLACE FUNCTION search_training_data(user_id_param UUID, query_text TEXT)
RETURNS TABLE (
  id UUID,
  question TEXT,
  answer TEXT,
  category TEXT,
  priority INTEGER,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    td.id,
    td.question,
    td.answer,
    td.category,
    td.priority,
    similarity(td.question, query_text) AS similarity
  FROM 
    chatbot_training_files td
  WHERE 
    td.user_id = user_id_param
  ORDER BY 
    similarity DESC,
    priority DESC
  LIMIT 5;
END;
$$;

-- Enhanced function to search both training data and files together with relevance ranking
CREATE OR REPLACE FUNCTION search_all_training_content(user_id_param UUID, query_text TEXT)
RETURNS TABLE (
  content_id UUID,
  content_type TEXT,
  content TEXT,
  category TEXT,
  priority INTEGER,
  similarity FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  (
    -- Get results from training data (Q&A pairs)
    SELECT 
      td.id AS content_id,
      'qa' AS content_type,
      td.answer AS content,
      td.category,
      td.priority,
      similarity(td.question, query_text) AS similarity
    FROM 
      chatbot_training_files td
    WHERE 
      td.user_id = user_id_param
  )
  UNION ALL
  (
    -- Get results from training files
    SELECT 
      tf.id AS content_id,
      'file' AS content_type,
      tf.extracted_text AS content,
      tf.category,
      tf.priority,
      similarity(tf.extracted_text, query_text) AS similarity
    FROM 
      chatbot_training_files_uploads tf
    WHERE 
      tf.user_id = user_id_param
  )
  ORDER BY 
    similarity DESC,
    priority DESC
  LIMIT 10;
END;
$$;

-- Function to search property listings with relevance matching
CREATE OR REPLACE FUNCTION search_properties(user_id_param UUID, query_text TEXT, max_results INTEGER DEFAULT 3)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price NUMERIC,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  city TEXT,
  state TEXT,
  status TEXT,
  url TEXT,
  living_area NUMERIC,
  plot_area NUMERIC,
  garage_area NUMERIC,
  terrace NUMERIC, 
  has_pool BOOLEAN,
  relevance FLOAT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    p.bedrooms,
    p.bathrooms,
    p.city,
    p.state,
    p.status,
    p.url,
    p.living_area,
    p.plot_area,
    p.garage_area,
    p.terrace,
    p.has_pool,
    -- Calculate relevance using various factors
    (
      similarity(p.title, query_text) * 2.0 +
      similarity(COALESCE(p.description, ''), query_text) * 1.0 +
      similarity(COALESCE(p.city, '') || ' ' || COALESCE(p.state, ''), query_text) * 1.5
    ) AS relevance
  FROM 
    properties p
  WHERE 
    p.user_id = user_id_param
    AND p.status = 'active'
  ORDER BY 
    relevance DESC,
    p.featured DESC,
    p.price DESC
  LIMIT max_results;
END;
$$;
