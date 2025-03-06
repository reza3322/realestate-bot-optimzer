
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

serve(async (req) => {
  console.log("🚀 Function process-pdf-content started");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.text();
    let parsedBody;

    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("❌ Error parsing request body:", parseError, "Raw body:", requestBody);
      return new Response(
        JSON.stringify({ error: "Invalid JSON format in request body" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { filePath, userId, contentType = "faqs" } = parsedBody;

    console.log(`📂 Received request to process file: ${filePath} for user: ${userId} with contentType: ${contentType}`);

    if (!filePath || !userId) {
      console.error("❌ Missing required parameters:", { filePath, userId });
      return new Response(
        JSON.stringify({ error: "Missing filePath or userId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📥 Downloading file from storage: ${filePath}`);

    // Download the file from Supabase storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("chatbot_training_files")
      .download(filePath);

    if (downloadError) {
      console.error("❌ Error downloading file:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ File downloaded successfully!");

    // Extract file name
    const fileName = filePath.split("/").pop() || "Unknown File";

    console.log(`🔍 Extracting text from ${fileName}`);

    let extractedText = "";

    try {
      // Get file type from fileName
      const fileType = fileName.split('.').pop()?.toLowerCase();
      
      // For different file types, process differently
      if (fileType === 'pdf') {
        // For PDFs, use text() as a simple extraction method
        // In a production environment, you might want to use a more robust PDF parsing library
        extractedText = await fileData.text();
      } else if (fileType === 'txt' || fileType === 'csv') {
        // For text and CSV files, simply get the text content
        extractedText = await fileData.text();
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (textError) {
      console.error("❌ Could not extract text from file:", textError);
      extractedText = `Unable to extract content from ${fileName}.`;
    }

    console.log(`📜 Extracted ${extractedText.length} characters from ${fileName}`);

    if (extractedText.length === 0) {
      console.error("❌ No text extracted from file");
      return new Response(
        JSON.stringify({ error: "No text could be extracted from the file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create chatbot training data entry
    const chatbotEntry = {
      user_id: userId,
      content_type: contentType,
      question: `What information is in ${fileName}?`,
      answer: extractedText.substring(0, 5000), // Limit to 5000 characters
      category: "File Import",
      priority: 5,
    };

    console.log(`📥 Inserting training data into Supabase:`, 
      JSON.stringify({
        user_id: chatbotEntry.user_id, 
        content_type: chatbotEntry.content_type,
        question: chatbotEntry.question,
        category: chatbotEntry.category,
        text_length: chatbotEntry.answer.length
      })
    );

    // Insert into chatbot training database
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_data")
      .insert(chatbotEntry)
      .select();

    if (insertError) {
      console.error("❌ ERROR INSERTING INTO DATABASE:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store training data", details: insertError }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    console.log("✅ Training data stored successfully!", insertData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        data: insertData,
        entriesCount: 1
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Unexpected error:", error);

    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
