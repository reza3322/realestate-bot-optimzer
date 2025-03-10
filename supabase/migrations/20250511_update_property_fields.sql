
-- Add additional fields to properties table
ALTER TABLE IF EXISTS public.properties 
ADD COLUMN IF NOT EXISTS living_area NUMERIC,
ADD COLUMN IF NOT EXISTS plot_area NUMERIC,
ADD COLUMN IF NOT EXISTS garage_area NUMERIC,
ADD COLUMN IF NOT EXISTS terrace NUMERIC,
ADD COLUMN IF NOT EXISTS has_pool BOOLEAN DEFAULT false;

-- Update search_properties_by_style function to include the new fields
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
