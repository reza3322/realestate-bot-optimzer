import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
import { PdfReader } from "https://deno.land/x/pdfreader@v1.1.1/mod.ts"; // ✅ Use Deno-compatible PDF reader

Deno.serve(async (req) => {
  console.log(`🔄 Request received: ${req.method}`);

  // Handle CORS Preflight Requests
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

    console.log(`📄 Processing file: ${filePath} for user: ${userId}, content type: ${contentType}, priority: ${priority}`);

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Fetch the PDF file (supports both storage & URL PDFs)
    const pdfBuffer = filePath.startsWith("http")
      ? await fetchPdfFromUrl(filePath)
      : await fetchFileFromSupabase(supabase, filePath);

    if (!pdfBuffer) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to retrieve the file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract Text from PDF or TXT File
    let extractedText = "";
    if (fileName.toLowerCase().endsWith(".pdf")) {
      console.log("📄 Processing PDF file");
      extractedText = await extractPdfText(pdfBuffer);
    } else if (fileName.toLowerCase().endsWith(".txt")) {
      console.log("📄 Processing text file");
      extractedText = new TextDecoder().decode(pdfBuffer);
    } else {
      console.error(`❌ Unsupported file type: ${fileName}`);
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported file type: ${fileName}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      console.error("❌ No text extracted from the file");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to extract text from file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);

    // Insert Extracted Content into Supabase Database
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_data")
      .insert({
        user_id: userId,
        content_type: contentType,
        question: `What information is in ${fileName}?`,
        answer: extractedText.substring(0, 5000), // Limit text length
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

// ✅ Extract Text from PDF Using pdfreader
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("🔍 Extracting text from PDF...");

    const reader = new PdfReader();
    let extractedText = "";

    await new Promise((resolve, reject) => {
      reader.parseBuffer(Buffer.from(pdfArrayBuffer), (err, item) => {
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
    return extractedText.trim();
  } catch (error) {
    console.error("❌ Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// ✅ Fetch PDF from Supabase Storage
async function fetchFileFromSupabase(supabase: any, filePath: string): Promise<ArrayBuffer> {
  console.log(`📥 Fetching file from Supabase: ${filePath}`);
  const { data: fileData, error } = await supabase
    .storage
    .from("chatbot_training_files")
    .download(filePath);

  if (error) {
    console.error("❌ Failed to download file:", error);
    return null;
  }

  return await fileData.arrayBuffer();
}

// ✅ Fetch PDF from a URL
async function fetchPdfFromUrl(url: string): Promise<ArrayBuffer> {
  console.log(`🌐 Fetching PDF from: ${url}`);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
  }

  return await response.arrayBuffer();
}
