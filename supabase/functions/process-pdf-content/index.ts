
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body and parse JSON
    const requestBody = await req.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError, "Raw body:", requestBody);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    const { filePath, userId, contentType } = parsedBody;
    
    if (!filePath || !userId || !contentType) {
      console.error("Missing required parameters:", { filePath, userId, contentType });
      throw new Error("Missing required parameters: filePath, userId, and contentType are required");
    }
    
    console.log(`Starting PDF processing for file: ${filePath}, user: ${userId}, type: ${contentType}`);
    
    // Create a Supabase client with the project URL and service_role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Server configuration error: Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Downloading file from: ${filePath}`);
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('chatbot_training_files')
      .download(filePath);
    
    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw downloadError;
    }
    
    if (!fileData) {
      console.error("No file data downloaded");
      throw new Error("No file data could be downloaded");
    }
    
    console.log("File downloaded successfully, size:", fileData.size);
    
    // Extract the file name from the path
    const fileName = filePath.split('/').pop() || "Unknown PDF";
    
    // Simple text extraction from PDF for demonstration
    // In a real implementation, you would use a proper PDF parsing library
    // For now, we'll create some basic training entries based on the file name
    
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
      },
      {
        user_id: userId,
        content_type: contentType,
        question: `When was "${fileName}" created?`,
        answer: `"${fileName}" was added to the system on ${new Date().toLocaleDateString()}. The original creation date of the document is not available.`,
        category: 'PDF Import',
        priority: 3
      }
    ];
    
    console.log(`Inserting ${entries.length} training entries`);
    
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
