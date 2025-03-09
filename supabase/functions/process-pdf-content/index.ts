
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

// Using TextEncoder and TextDecoder from the global scope instead of importing
// They are available in the Deno runtime by default

Deno.serve(async (req) => {
  console.log(`🔄 Request received: ${req.method}`);

  if (req.method === "OPTIONS") {
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

    const { filePath, userId, fileName, priority = 5, contentType = "application/octet-stream" } = body;

    if (!filePath || !userId || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📄 Processing file: ${filePath} for user: ${userId}`);
    console.log(`📄 Content Type: ${contentType}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    console.log(`📥 Attempting to download file: ${filePath}`);
    const { data: fileResponse, error: downloadError } = await supabase
      .storage
      .from("chatbot_training_files")
      .download(filePath);

    if (downloadError) {
      console.error("❌ Download Error:", downloadError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to download file", details: downloadError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!fileResponse) {
      console.error("❌ No file data received");
      return new Response(
        JSON.stringify({ success: false, error: "No file data received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ File downloaded successfully");
    console.log("📂 File response type:", typeof fileResponse);

    let fileData;
    try {
      // Handle different response types from storage API
      if (fileResponse instanceof Uint8Array || fileResponse instanceof ArrayBuffer) {
        fileData = fileResponse;
      } else if (typeof fileResponse === 'object' && fileResponse !== null) {
        // If it's a Response-like object or Blob
        if ('arrayBuffer' in fileResponse && typeof fileResponse.arrayBuffer === 'function') {
          fileData = await fileResponse.arrayBuffer();
        } else if ('blob' in fileResponse && typeof fileResponse.blob === 'function') {
          const blob = await fileResponse.blob();
          fileData = await blob.arrayBuffer();
        } else {
          throw new Error(`Cannot process file data of type: ${typeof fileResponse}`);
        }
      } else {
        throw new Error(`Unexpected file data format: ${typeof fileResponse}`);
      }
    } catch (error) {
      console.error("❌ Error processing file data:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to process file data", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedText = "";
    let finalContentType = contentType || "application/octet-stream"; // Ensure content type is not null

    // Determine content type based on file extension if not provided
    if (!finalContentType || finalContentType === "application/octet-stream") {
      if (fileName.toLowerCase().endsWith(".pdf")) {
        finalContentType = "application/pdf";
      } else if (fileName.toLowerCase().endsWith(".txt")) {
        finalContentType = "text/plain";
      }
    }

    console.log("📄 Final Content Type:", finalContentType);

    // Extract text based on content type
    if (finalContentType === "application/pdf") {
      console.log("📄 Processing PDF file");
      try {
        if (fileData instanceof ArrayBuffer || ArrayBuffer.isView(fileData)) {
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(fileData);
          
          // Extract text content from PDF
          extractedText = text.replace(/[^\x20-\x7E\n]/g, '');
          
          if (!extractedText.trim()) {
            console.log("⚠️ No text found in PDF. Returning fallback.");
            extractedText = "PDF content extraction failed. Please upload a text version of this document.";
          }
        } else {
          console.error("⚠️ File data is not in a decodable format:", typeof fileData);
          extractedText = "PDF content extraction failed. Invalid file format.";
        }
      } catch (pdfError) {
        console.error("PDF extraction error:", pdfError);
        extractedText = "PDF content extraction failed. Please upload a text version of this document.";
      }
    } else if (finalContentType === "text/plain") {
      if (fileData instanceof ArrayBuffer || ArrayBuffer.isView(fileData)) {
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(fileData);
      } else {
        console.error("⚠️ Text file data is not in a decodable format:", typeof fileData);
        extractedText = "Text content extraction failed. Invalid file format.";
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported file type: ${fileName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📄 Detected Content Type:", finalContentType);

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No text was extracted from the file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);
    console.log(`🔍 Inserting into chatbot_training_files table...`);

    // ✅ Store File Metadata in chatbot_training_files Table, ensuring content_type is provided
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_files")
      .insert({
        user_id: userId,
        source_file: fileName,
        extracted_text: extractedText.substring(0, 5000),
        category: "File Import",
        priority: parseInt(priority, 10) || 5,
        content_type: finalContentType // Ensuring this value is set
      })
      .select();

    if (insertError) {
      console.error("❌ DATABASE ERROR:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store file data", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Successfully inserted data into chatbot_training_files table");
    console.log("📊 Insert result:", insertData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        entriesCreated: 1,
        priority: priority,
        table: "chatbot_training_files"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
