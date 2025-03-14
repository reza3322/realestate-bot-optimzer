
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
    -- Get results from Q&A training data
    SELECT 
      td.id AS content_id,
      'qa' AS content_type,
      CASE
        WHEN td.question IS NOT NULL AND td.answer IS NOT NULL THEN 
          'Q: ' || td.question || E'\nA: ' || td.answer
        ELSE
          td.answer
      END AS content,
      td.category,
      COALESCE(td.priority, 10) AS priority,
      similarity(COALESCE(td.question, ''), query_text) AS similarity
    FROM 
      chatbot_training_files td
    WHERE 
      td.user_id = user_id_param
      AND td.question IS NOT NULL
      AND td.answer IS NOT NULL
  )
  UNION ALL
  (
    -- Get results from extracted text from website crawls
    SELECT 
      td.id AS content_id,
      'extracted_text' AS content_type,
      td.extracted_text AS content,
      COALESCE(td.category, 'Website Content') AS category,
      COALESCE(td.priority, 5) AS priority,
      similarity(td.extracted_text, query_text) AS similarity
    FROM 
      chatbot_training_files td
    WHERE 
      td.user_id = user_id_param
      AND td.extracted_text IS NOT NULL
      AND td.extracted_text != ''
  )
  ORDER BY 
    similarity DESC,
    priority DESC
  LIMIT 10;
END;
$$;
