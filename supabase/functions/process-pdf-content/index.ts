
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
    
    // For this example, we'll extract a simple placeholder text
    // In a real implementation, you would use a PDF parsing library
    // But for the sake of this demo, we'll just create a placeholder entry
    
    // Insert a placeholder entry in the chatbot_training_data table
    const { data: insertData, error: insertError } = await supabase
      .from('chatbot_training_data')
      .insert({
        user_id: userId,
        content_type: contentType,
        question: `[PDF] ${filePath.split('/').pop()}`,
        answer: "This content was extracted from an uploaded PDF file.",
        category: 'PDF Import',
        priority: 5
      })
      .select();
    
    if (insertError) {
      console.error("Error inserting PDF content:", insertError);
      throw insertError;
    }
    
    console.log("PDF processed successfully:", insertData);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "PDF processed successfully",
        data: insertData
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
