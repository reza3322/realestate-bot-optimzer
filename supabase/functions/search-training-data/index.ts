
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
    const requestData = await req.json() as SearchRequest;
    console.log("🔍 Request data:", JSON.stringify(requestData, null, 2));
    
    // Validate required fields
    if (!requestData.query) {
      console.error("❌ Missing required field: query");
      return new Response(
        JSON.stringify({ error: "Missing required field: query" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
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
    
    // Log before database query
    console.log(`🔍 Searching for training data for user: ${requestData.userId}`);
    console.log(`🔍 Query: "${requestData.query}"`);
    
    // Use the search_all_training_content function for more comprehensive results
    const { data, error } = await supabase
      .rpc('search_all_training_content', {
        user_id_param: requestData.userId,
        query_text: requestData.query
      });
    
    // Log database query results
    if (error) {
      console.error("❌ Database query error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Database error", 
          message: error.message,
          details: error.details,
          hint: error.hint
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`🔍 Found ${data?.length || 0} training content items`);
    
    // Process and format results
    const results = data?.map(item => ({
      id: item.content_id,
      contentType: item.content_type,
      content: item.content,
      category: item.category,
      priority: item.priority,
      similarity: item.similarity
    })) || [];
    
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
    
    return new Response(
      JSON.stringify({
        qa_matches,
        file_content,
        property_listings: [], // Empty for now, could be added later
        meta: {
          total: results.length,
          query: requestData.query,
          userId: requestData.userId,
          timestamp: new Date().toISOString()
        }
      }),
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
