import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
import { PdfReader } from "https://deno.land/x/pdfreader@v1.1.1/mod.ts";

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

    const { filePath, userId, contentType, fileName, priority = 5 } = body;

    if (!filePath || !userId || !contentType || !fileName) {
      console.error("❌ Missing required fields:", body);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📄 Processing file: ${filePath} for user: ${userId}, content type: ${contentType}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    console.log(`📥 Attempting to download file: ${filePath}`);
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

    console.log("✅ File downloaded successfully");

    let extractedText = "";
    if (fileName.toLowerCase().endsWith(".pdf")) {
      console.log("📄 Processing PDF file");
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        extractedText = await extractPdfText(arrayBuffer);
      } catch (pdfError) {
        console.error("❌ Error extracting PDF text:", pdfError);
        return new Response(
          JSON.stringify({ success: false, error: `Failed to extract text from PDF: ${pdfError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
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
        JSON.stringify({ success: false, error: "No text was extracted from the file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);

    // ✅ Fully sanitize extracted text before inserting into PostgreSQL
    extractedText = extractedText
      .replace(/\u0000/g, "") // Remove null characters
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove all control characters
      .replace(/[^\x20-\x7EäöüßÄÖÜéèàù]/g, "") // Keep common characters
      .replace(/\s+/g, " ") // Normalize spaces
      .normalize("NFC") // Ensure proper UTF-8 encoding
      .trim();

    console.log(`🔢 Using priority level: ${priority}`);

    console.log("💾 Inserting extracted text into database...");
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_data")
      .insert({
        user_id: userId,
        content_type: contentType,
        question: `What information is in ${fileName}?`,
        answer: extractedText.substring(0, 5000), // ✅ Prevents long text issues
        category: "File Import",
        priority: parseInt(priority, 10) || 5
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
        entriesCreated: 1,
        priority: priority
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

// ✅ Extract Text from PDF Function using `pdfreader`
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔍 Extracting text from PDF...");

    const reader = new PdfReader();
    let extractedText = "";

    await new Promise((resolve, reject) => {
      reader.parseBuffer(new Uint8Array(pdfArrayBuffer), (err, item) => {
        if (err) {
          reject(err);
        } else if (!item) {
          resolve(null); // End of PDF
        } else if (item.text) {
          extractedText += item.text + " ";
        }
      });
    });

    console.log("✅ PDF text extraction successful!");

    // ✅ Final sanitization
    return extractedText
      .replace(/\u0000/g, "") // Remove null characters
      .replace(/[\x00-\x1F\x7F]/g, "") // Remove all control characters
      .replace(/[^\x20-\x7EäöüßÄÖÜéèàù]/g, "") // Keep common characters
      .replace(/\s+/g, " ") // Normalize spaces
      .normalize("NFC") // Ensure UTF-8 encoding
      .trim();

  } catch (error) {
    console.error("❌ Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

