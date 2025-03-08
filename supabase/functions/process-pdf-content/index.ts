
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

// Import a more reliable PDF library for Deno
import { parse as parsePdf } from "https://deno.land/x/pdfparser@v1.0.5/mod.ts";

Deno.serve(async (req) => {
  console.log(`🔄 Request received: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log("🟢 Handling CORS preflight request...");
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
      status: 204,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: `Unsupported method: ${req.method}` }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("🚀 Processing request...");
    const body = await req.json();
    console.log("📥 Received Body:", body);

    const { filePath, userId, contentType, fileName } = body;

    if (!filePath || !userId || !contentType || !fileName) {
      console.error("❌ Missing required fields:", body);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📄 Processing file: ${filePath} for user: ${userId}, content type: ${contentType}`);

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Check if bucket exists
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error("❌ Error checking buckets:", bucketsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check storage buckets", details: bucketsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bucketExists = buckets.some(bucket => bucket.name === "chatbot_training_files");
    if (!bucketExists) {
      console.error("❌ Bucket 'chatbot_training_files' does not exist");
      return new Response(
        JSON.stringify({ success: false, error: "Storage bucket 'chatbot_training_files' does not exist" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download File from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("chatbot_training_files")
      .download(filePath);

    if (downloadError) {
      console.error("❌ Failed to download file:", downloadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to download file", details: downloadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract Text from File
    let extractedText = "";
    if (fileName.toLowerCase().endsWith(".pdf")) {
      console.log("📄 Processing PDF file");
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = await extractPdfText(arrayBuffer);
    } else if (fileName.toLowerCase().endsWith(".txt")) {
      console.log("📄 Processing text file");
      extractedText = await fileData.text();
    } else {
      console.error(`❌ Unsupported file type: ${fileName}`);
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported file type: ${fileName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.error("❌ No text was extracted from the file");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to extract text from file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);

    // Insert Extracted Content into Supabase
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_data")
      .insert({
        user_id: userId,
        content_type: contentType,
        question: `What information is in ${fileName}?`,
        answer: extractedText.substring(0, 5000),
        category: "File Import",
        priority: 5
      })
      .select();

    if (insertError) {
      console.error("❌ ERROR INSERTING INTO DATABASE:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store training data", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Training data stored successfully:", insertData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        entriesCreated: 1
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Error processing file:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Extract Text from PDF Function
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔍 Starting PDF text extraction...");
    
    // Use the Deno PDF parser library to extract text
    const pdfData = new Uint8Array(pdfArrayBuffer);
    const result = await parsePdf(pdfData);
    
    if (!result || !result.text) {
      throw new Error("Could not extract text from PDF");
    }
    
    console.log(`📝 Extracted total of ${result.text.length} characters from PDF`);
    return result.text;
  } catch (error) {
    console.error("❌ Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}
