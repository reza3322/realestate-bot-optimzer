import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
import { PdfReader } from "https://deno.land/x/pdfreader@v1.1.1/mod.ts";
import { recognize } from "https://deno.land/x/tesseract@v1.0.0/mod.ts";

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

    const { filePath, userId, contentType, fileName, priority = 5 } = body;

    if (!filePath || !userId || !contentType || !fileName) {
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

        if (!extractedText.trim()) {
          console.log("⚠️ No text found in PDF. Attempting OCR...");
          extractedText = await extractTextWithOCR(arrayBuffer);
        }
      } catch (pdfError) {
        return new Response(
          JSON.stringify({ success: false, error: `Failed to extract text from PDF: ${pdfError.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else if (fileName.toLowerCase().endsWith(".txt")) {
      extractedText = await fileData.text();
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported file type: ${fileName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No text was extracted from the file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);

    // ✅ **STRONG Unicode Sanitization**
    extractedText = cleanText(extractedText);

    console.log("💾 Storing extracted text in the correct table...");

    // ✅ **Insert training data into the correct table**
    const tableName = contentType === "faq" ? "chatbot_training_data" : "chatbot_training_files";

    const { data: insertData, error: insertError } = await supabase
      .from(tableName)
      .insert({
        user_id: userId,
        content_type: contentType,
        source_file: fileName, // Store file name instead of using it as a question
        extracted_text: extractedText.substring(0, 5000),
        category: "File Import",
        priority: parseInt(priority, 10) || 5
      })
      .select();

    if (insertError) {
      console.error("❌ DATABASE ERROR:", insertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store training data", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ✅ Clean text function
function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, "") // Remove null bytes
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove control characters
    .replace(/\s+/g, " ") // Replace multiple spaces
    .trim();
}

// ✅ Extract text from PDF function
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔍 Extracting text from PDF...");
    const reader = new PdfReader();
    let extractedText = "";

    await new Promise((resolve, reject) => {
      reader.parseBuffer(new Uint8Array(pdfArrayBuffer), (err, item) => {
        if (err) reject(err);
        else if (!item) resolve(null);
        else if (item.text) extractedText += item.text + " ";
      });
    });

    return extractedText.trim();
  } catch (error) {
    console.error("❌ Error extracting PDF text:", error);
    return "";
  }
}

// ✅ OCR function for scanned PDFs
async function extractTextWithOCR(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("📸 Running OCR on PDF...");
    const image = new Uint8Array(pdfArrayBuffer);
    const text = await recognize(image, "eng");
    return text.trim();
  } catch (error) {
    console.error("❌ OCR Extraction Failed:", error);
    return "OCR failed to extract text from this PDF.";
  }
}
