import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
import { createPDFReader } from "https://deno.land/x/pdfium_wasm@v0.0.3/mod.ts";

Deno.serve(async (req) => {
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

    const body = await req.json();
    const { filePath, userId, fileName, priority = 5 } = body;

    if (!filePath || !userId || !fileName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

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

    let extractedText = "";
    if (fileName.toLowerCase().endsWith(".pdf")) {
      try {
        extractedText = await extractPdfText(fileData);
        if (!extractedText.trim()) {
          extractedText = "This PDF could not be processed automatically. Please consider uploading a text file version.";
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

    // Insert into chatbot_training_files table
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_files")
      .insert({
        user_id: userId,
        source_file: fileName,
        extracted_text: extractedText.substring(0, 5000),
        category: "File Import",
        priority: parseInt(priority, 10) || 5
      })
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store file data", details: insertError }),
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

async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const pdfReader = await createPDFReader();
    const pdfDocument = await pdfReader.loadDocument(new Uint8Array(pdfArrayBuffer));

    let extractedText = "";
    const pageCount = pdfDocument.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDocument.getPage(i);
      const text = page.getText();
      extractedText += text + " ";
      page.delete();
    }

    pdfDocument.delete();
    pdfReader.delete();

    return extractedText.trim();
  } catch (error) {
    throw error;
  }
}