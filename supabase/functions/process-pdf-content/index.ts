
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
import { PDFDocument } from "https://deno.land/x/pdf@v1.2.0/mod.ts"; // ✅ Proper PDF text extraction

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

    const { filePath, userId, fileName, priority = 5, contentType = "" } = body;

    if (!filePath || !userId || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📄 Processing file: ${filePath} for user: ${userId}`);

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
    console.log("📂 Debug: Raw file response type:", typeof fileResponse, fileResponse instanceof Response);

    // Handle different possible formats of fileResponse
    let fileData: ArrayBuffer;
    
    if (fileResponse instanceof Uint8Array) {
      console.log("📄 Converting Uint8Array to ArrayBuffer");
      fileData = fileResponse.buffer;
    } else if (fileResponse instanceof ArrayBuffer) {
      console.log("📄 Using existing ArrayBuffer");
      fileData = fileResponse;
    } else if (fileResponse instanceof Response || 'arrayBuffer' in fileResponse) {
      console.log("📄 Converting Response to ArrayBuffer");
      // @ts-ignore: We've already checked if arrayBuffer exists
      fileData = await fileResponse.arrayBuffer();
    } else if (fileResponse instanceof Blob) {
      console.log("📄 Converting Blob to ArrayBuffer");
      fileData = await fileResponse.arrayBuffer();
    } else {
      console.error("❌ Unknown file data format:", typeof fileResponse);
      return new Response(
        JSON.stringify({ success: false, error: "Unsupported file data format" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedText = "";
    let finalContentType = contentType || "application/octet-stream";

    // Determine content type based on file extension if not explicitly provided
    if (finalContentType === "application/octet-stream") {
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
        extractedText = await extractPdfText(fileData);
        
        // Clean up the extracted text
        if (extractedText) {
          console.log("🧹 Cleaning up extracted text");
          extractedText = cleanupPdfText(extractedText);
        }
      } catch (pdfError) {
        console.error("❌ PDF extraction error:", pdfError);
        extractedText = "PDF content extraction failed. This may be an image-based PDF or have security restrictions. Please upload a text version.";
      }
    } else if (finalContentType === "text/plain") {
      extractedText = new TextDecoder("utf-8").decode(fileData);
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
    
    // Check if we have meaningful content (not just PDF structure)
    if (extractedText.length < 50 && finalContentType === "application/pdf") {
      console.log("⚠️ Extracted text is too short, might be missing content");
      extractedText = "The PDF appears to contain very little text content. It may be an image-based PDF or have security restrictions. Please upload a text version if available.";
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);
    console.log(`🔍 Sample of extracted text: ${extractedText.substring(0, 100)}...`);
    console.log(`🔍 Inserting into chatbot_training_files table...`);

    // ✅ Store File Metadata in chatbot_training_files Table
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_files")
      .insert({
        user_id: userId,
        source_file: fileName,
        extracted_text: extractedText.substring(0, 5000), // Limit to first 5000 characters
        category: "File Import",
        priority: parseInt(priority, 10) || 5,
        content_type: finalContentType
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

// ✅ **PDF Text Extraction Function**
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔍 Extracting text from PDF...");

    // Load PDF and extract text
    const pdfDoc = await PDFDocument.load(new Uint8Array(pdfArrayBuffer));
    let extractedText = "";

    for (let i = 0; i < pdfDoc.getPageCount(); i++) {
      const page = pdfDoc.getPage(i);
      extractedText += page.getText() + "\n\n"; // Preserve formatting
    }

    console.log(`✅ Extracted ${extractedText.length} characters from PDF.`);
    return extractedText.trim();
  } catch (error) {
    console.error("❌ Error extracting PDF text:", error);
    throw error;
  }
}

// ✅ **Clean up the extracted PDF text to make it more readable**
function cleanupPdfText(text: string): string {
  try {
    // If we have raw PDF data, try to filter out the non-text content
    if (text.startsWith("%PDF-")) {
      console.log("🧹 Cleaning up raw PDF binary data");
      
      // Remove PDF structure markers
      text = text
        .replace(/%PDF-[\d.]+/, "")
        .replace(/%[^\n]*\n/g, "")
        .replace(/endobj|endstream|obj|stream/g, " ")
        .replace(/<<[^>]*>>/g, " ");
    }
    
    // General cleanup for any text
    return text
      .replace(/\\n/g, "\n") // Convert literal \n to actual line breaks
      .replace(/\\r/g, "") // Remove literal \r
      .replace(/\\t/g, "  ") // Convert literal \t to spaces
      .replace(/\\\\/g, "\\") // Convert double backslashes to single
      .replace(/\\\(/g, "(") // Convert escaped parentheses 
      .replace(/\\\)/g, ")") // Convert escaped parentheses
      .replace(/\s{2,}/g, " ") // Replace multiple spaces with single space
      .replace(/\n{3,}/g, "\n\n") // Replace multiple line breaks with double line break
      .trim(); // Remove leading/trailing whitespace
  } catch (error) {
    console.error("❌ Error cleaning PDF text:", error);
    return text; // Return original if cleaning fails
  }
}
