
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
    chatbot_training_data td
  WHERE 
    td.user_id = user_id_param
  ORDER BY 
    similarity DESC,
    priority DESC
  LIMIT 5;
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
