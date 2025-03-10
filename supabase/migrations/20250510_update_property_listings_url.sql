
-- Add URL column to properties table for chatbot to include in recommendations
ALTER TABLE IF EXISTS public.properties 
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add ability to search properties with similarity matching using the function we created earlier
CREATE OR REPLACE FUNCTION search_properties_by_style(user_id_param UUID, style_query TEXT, max_results INTEGER DEFAULT 3)
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
    -- Calculate relevance using various factors with emphasis on style matching
    (
      similarity(COALESCE(p.description, ''), style_query) * 3.0 +
      similarity(p.title, style_query) * 1.5 +
      similarity(COALESCE(p.city, '') || ' ' || COALESCE(p.state, ''), style_query) * 1.0
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
