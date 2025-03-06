
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, userId, contentType } = await req.json();
    
    // Create a Supabase client with the project URL and service_role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Processing PDF file: ${filePath} for user: ${userId}`);
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('chatbot_training_files')
      .download(filePath);
    
    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw downloadError;
    }
    
    // Extract the file name from the path
    const fileName = filePath.split('/').pop() || "Unknown PDF";
    
    // For this example, we'll extract a simple placeholder text
    // In a real implementation, you would use a PDF parsing library
    
    // Create multiple training entries for demonstration purposes
    const entries = [
      {
        user_id: userId,
        content_type: contentType,
        question: `What is in the document "${fileName}"?`,
        answer: `This document contains important information extracted from "${fileName}". For specific details, please ask more specific questions about its content.`,
        category: 'PDF Import',
        priority: 5
      },
      {
        user_id: userId,
        content_type: contentType,
        question: `Tell me about ${fileName}`,
        answer: `"${fileName}" is a document that was uploaded to the system. It contains information that may be relevant to your inquiries.`,
        category: 'PDF Import',
        priority: 4
      }
    ];
    
    // Insert entries in the chatbot_training_data table
    const { data: insertData, error: insertError } = await supabase
      .from('chatbot_training_data')
      .insert(entries)
      .select();
    
    if (insertError) {
      console.error("Error inserting PDF content:", insertError);
      throw insertError;
    }
    
    console.log("PDF processed successfully, created entries:", insertData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "PDF processed successfully",
        data: insertData,
        entriesCount: entries.length
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing PDF:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
