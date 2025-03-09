
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
    similarity DESC
  LIMIT 5;
END;
$$;
