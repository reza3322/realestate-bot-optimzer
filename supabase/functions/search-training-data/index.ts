
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

interface SearchRequest {
  query: string;
  userId: string;
  conversationId?: string;
  includeQA?: boolean;
  includeFiles?: boolean;
  includeProperties?: boolean;
  maxResults?: number;
}

serve(async (req) => {
  console.log("🔍 SEARCH-TRAINING-DATA FUNCTION CALLED");
  console.log(`🔍 Request Method: ${req.method}`);
  console.log(`🔍 Request URL: ${req.url}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("🔍 Handling CORS preflight request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Log headers for debugging
    console.log("🔍 Request headers:", Object.fromEntries(req.headers.entries()));
    
    // For test requests, return a simple success response
    if (req.headers.get("X-Test-Request") === "true") {
      console.log("🔍 Received test request, returning simple response");
      return new Response(
        JSON.stringify({ status: "ok", message: "Test request successful" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse request body
    let requestData;
    try {
      const requestText = await req.text();
      console.log("🔍 Raw request body:", requestText);
      requestData = JSON.parse(requestText) as SearchRequest;
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", details: parseError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log("🔍 Parsed request data:", JSON.stringify(requestData, null, 2));
    
    // CRITICAL VALIDATION: Make sure we have a userId
    if (!requestData.userId) {
      console.error("❌ Missing required field: userId");
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://ckgaqkbsnrvccctqxsqv.supabase.co";
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM";
    
    console.log(`🔍 Connecting to Supabase at ${supabaseUrl}`);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // We will always use the userId passed in the request - this is the user whose chatbot is deployed
    // and whose training data we need to retrieve, NOT the visitor's ID
    const userIdToQuery = requestData.userId;
    console.log(`🔍 Searching for training data for user: ${userIdToQuery}`);
    
    // Check if userId is a valid UUID
    let results = [];
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userIdToQuery);
    
    if (!isValidUUID) {
      console.error(`❌ Invalid UUID format for userId: ${userIdToQuery}`);
      return new Response(
        JSON.stringify({ 
          error: "Invalid userId format", 
          message: "The userId must be a valid UUID"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    try {
      // For authenticated users, use the RPC function with the provided UUID
      console.log(`🔍 Searching for training data for user: ${userIdToQuery}`);
      console.log(`🔍 Query: "${requestData.query}"`);
      
      // Try direct query to chatbot_training_files table first for better debugging
      console.log("🔍 DEBUG: Performing direct query to chatbot_training_files table");
      const { data: directData, error: directError } = await supabase
        .from('chatbot_training_files')
        .select('*')
        .eq('user_id', userIdToQuery)
        .limit(5);
        
      if (directError) {
        console.error("❌ Direct query error:", directError);
      } else {
        console.log(`🔍 DEBUG: Found ${directData?.length || 0} records in direct table query`);
        console.log("🔍 DEBUG: Sample data:", JSON.stringify(directData?.slice(0, 2), null, 2));
      }
      
      // Use the search_all_training_content function for more comprehensive results
      const { data, error } = await supabase
        .rpc('search_all_training_content', {
          user_id_param: userIdToQuery,
          query_text: requestData.query
        });
      
      // Log database query results
      if (error) {
        console.error("❌ Database RPC query error:", error);
        
        // If we get an RPC error, fall back to direct query
        console.log("⚠️ RPC query failed, falling back to direct query");
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('chatbot_training_files')
          .select('*')
          .eq('user_id', userIdToQuery)
          .order('priority', { ascending: false })
          .limit(20);
          
        if (fallbackError) {
          console.error("❌ Fallback query error:", fallbackError);
          return new Response(
            JSON.stringify({ 
              error: "Database error", 
              message: fallbackError.message,
              details: fallbackError.details,
              hint: fallbackError.hint
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`🔍 Found ${fallbackData?.length || 0} training content items via fallback query`);
        
        // Process fallback results with basic similarity
        results = fallbackData?.map(item => {
          let similarity = 0.5; // Default similarity
          
          if (item.question) {
            const questionWords = item.question.toLowerCase().split(/\s+/);
            const queryWords = requestData.query.toLowerCase().split(/\s+/);
            const matchCount = questionWords.filter(word => queryWords.includes(word)).length;
            
            if (matchCount > 0) {
              similarity = Math.min(0.9, 0.5 + (matchCount / questionWords.length) * 0.4);
            }
          }
          
          return {
            id: item.id,
            contentType: item.content_type || 'qa',
            content: item.question && item.answer ? 
                    `Q: ${item.question}\nA: ${item.answer}` : 
                    (item.extracted_text || item.answer || ''),
            category: item.category,
            priority: item.priority || 5,
            similarity: similarity
          };
        }) || [];
      } else {
        console.log(`🔍 Found ${data?.length || 0} training content items via RPC`);
        
        // Process and format results from RPC function
        results = data?.map(item => ({
          id: item.content_id,
          contentType: item.content_type,
          content: item.content,
          category: item.category,
          priority: item.priority,
          similarity: item.similarity
        })) || [];
      }
    } catch (queryError) {
      console.error("❌ Error in query execution:", queryError);
      return new Response(
        JSON.stringify({ error: "Database query error", message: queryError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Sort by similarity then by priority
    results.sort((a, b) => 
      b.similarity !== a.similarity 
        ? b.similarity - a.similarity 
        : b.priority - a.priority
    );
    
    // Format results into different arrays for backward compatibility
    const qa_matches = results
      .filter(item => item.contentType === 'qa')
      .map(item => {
        const parts = item.content.split('\n');
        let question = '', answer = '';
        
        if (parts.length >= 2) {
          // Extract question and answer from the format "Q: question\nA: answer"
          const questionMatch = parts[0].match(/^Q:\s*(.*)/);
          const answerMatch = parts[1].match(/^A:\s*(.*)/);
          
          question = questionMatch ? questionMatch[1] : '';
          answer = answerMatch ? answerMatch[1] : '';
        } else {
          // If not in Q/A format, use the content as the answer
          answer = item.content;
        }
        
        return {
          id: item.id,
          question,
          answer,
          category: item.category,
          priority: item.priority,
          similarity: item.similarity,
        };
      });
    
    const file_content = results
      .filter(item => item.contentType !== 'qa')
      .map(item => ({
        id: item.id,
        source: item.category || 'Website',
        text: item.content,
        category: item.category,
        priority: item.priority,
        similarity: item.similarity,
      }));
    
    // Log the final response
    console.log(`🔍 Returning ${qa_matches.length} QA matches and ${file_content.length} file content items`);
    
    const response = {
      qa_matches,
      file_content,
      property_listings: [], // Empty for now, could be added later
      meta: {
        total: results.length,
        query: requestData.query,
        userId: userIdToQuery,
        timestamp: new Date().toISOString()
      }
    };
    
    console.log("🔍 Final response (truncated):", JSON.stringify(response).substring(0, 200) + "...");
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    // Enhanced error logging
    console.error("❌ ERROR IN SEARCH-TRAINING-DATA:", error);
    console.error("❌ Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error.message,
        stack: Deno.env.get("DEBUG") === "true" ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
