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
      console.error("❌ Error parsing request body:", parseError, "Raw body:", requestBody);
      return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { filePath, userId, contentType } = parsedBody;

    if (!filePath || !userId || !contentType) {
      console.error("❌ Missing required parameters:", { filePath, userId, contentType });
      return new Response(JSON.stringify({ error: "Missing filePath, userId, or contentType" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log(`✅ Processing file at path: ${filePath}, user: ${userId}, type: ${contentType}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Missing Supabase credentials");
      return new Response(JSON.stringify({ error: "Server configuration error: Missing Supabase credentials" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`📥 Downloading file from: ${filePath}`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("chatbot_training_files")
      .download(filePath);

    if (downloadError || !fileData) {
      console.error("❌ Error downloading file:", downloadError || "No file data found");
      return new Response(JSON.stringify({ error: "Failed to download file" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log("✅ File downloaded successfully!");

    // Extract file name and extension
    const fileName = filePath.split("/").pop() || "Unknown File";
    const fileExt = fileName.split(".").pop()?.toLowerCase() || "";

    let fileContent = "";

    try {
      fileContent = await fileData.text();
    } catch (textError) {
      console.error("❌ Error extracting text from file:", textError);
      fileContent = `Unable to extract full content from ${fileName}.`;
    }

    console.log(`📜 Extracted ${fileContent.length} characters from ${fileName}`);

    // Generate training entries
    const entries = [
      {
        user_id: userId,
        content_type: contentType,
        question: `What information do you have about ${fileName}?`,
        answer: `The file "${fileName}" contains: ${fileContent.substring(0, 500)}${fileContent.length > 500 ? "..." : ""}`,
        category: "Imported Content",
        priority: 5,
      },
      {
        user_id: userId,
        content_type: contentType,
        question: `Tell me about ${fileName}`,
        answer: `Here's a summary: ${fileContent.substring(0, 500)}${fileContent.length > 500 ? "..." : ""}`,
        category: "Imported Content",
        priority: 4,
      },
    ];

    console.log(`✅ Preparing to insert ${entries.length} records into chatbot_training_data`);

    // Insert entries into the chatbot_training_data table
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_data")
      .insert(entries)
      .select();

    if (insertError) {
      console.error("❌ ERROR INSERTING INTO DATABASE:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store training data", details: insertError }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    console.log("✅ Training data stored successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        data: insertData,
        entriesCount: entries.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error processing file:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
