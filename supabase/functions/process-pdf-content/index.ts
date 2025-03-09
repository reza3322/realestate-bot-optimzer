
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
// The previous PDF library doesn't exist, switching to pdfjs which is Deno-compatible
import * as pdfjs from "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.min.js";

// Initialize PDF.js worker
const pdfjsWorker = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.4.120/build/pdf.worker.min.js";
if (typeof globalThis.window === 'undefined') {
  // Set up for non-browser environment
  pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

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

    const { filePath, userId, fileName } = body;

    if (!filePath || !userId || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📄 Downloading file: ${filePath} for user: ${userId}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // 🔽 **Download the file from Supabase storage**
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

    // 🔽 Convert fileResponse to ArrayBuffer
    const fileData = await fileResponse.arrayBuffer();

    // 🔽 **Extract text from the PDF**
    let extractedText = "";
    try {
      extractedText = await extractPdfText(fileData);
    } catch (pdfError) {
      console.error("❌ PDF extraction error:", pdfError);
      extractedText = "PDF content extraction failed. This may be an image-based PDF or have security restrictions.";
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No text was extracted from the file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);
    console.log(`🔍 Sample of extracted text: ${extractedText.substring(0, 100)}...`);

    // ✅ **Store Extracted Text in Supabase**
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_files")
      .insert({
        user_id: userId,
        source_file: fileName,
        extracted_text: extractedText.substring(0, 5000), // Limit to first 5000 characters
        category: "File Import",
        priority: 5,
        content_type: "application/pdf"
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

// ✅ **New PDF Text Extraction Function**
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔍 Extracting text from PDF...");
    
    // Load the PDF file
    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfArrayBuffer) });
    const pdf = await loadingTask.promise;
    
    console.log(`📄 PDF loaded successfully with ${pdf.numPages} pages`);
    
    let extractedText = "";
    
    // Process each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Extract text from the page
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");
        
      extractedText += pageText + "\n\n"; // Add double newline between pages
    }
    
    // Clean up the text
    extractedText = cleanupPdfText(extractedText);
    
    console.log(`✅ Extracted ${extractedText.length} characters from PDF.`);
    return extractedText.trim();
  } catch (error) {
    console.error("❌ Error extracting PDF text:", error);
    throw error;
  }
}

// Function to clean up text extracted from PDFs
function cleanupPdfText(text: string): string {
  if (!text) return "";
  
  return text
    .replace(/(\r\n|\n|\r)/gm, " ") // Replace line breaks with spaces
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/[^\x20-\x7E\s]/g, "") // Remove non-ASCII characters
    .trim();
}
