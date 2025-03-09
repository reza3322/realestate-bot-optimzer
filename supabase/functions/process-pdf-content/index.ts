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

    // Clean the extracted text to remove problematic characters
    extractedText = cleanText(extractedText);
    
    // Break down the content into meaningful chunks
    const chunks = splitContentIntoChunks(extractedText, fileName);
    
    console.log(`🧩 Split content into ${chunks.length} chunks for training`);
    
    let insertedCount = 0;
    
    // Insert each chunk as a separate training data entry
    for (const chunk of chunks) {
      try {
        const { data: insertData, error: insertError } = await supabase
          .from("chatbot_training_data")
          .insert({
            user_id: userId,
            content_type: contentType,
            question: chunk.question,
            answer: chunk.answer,
            category: `File: ${fileName}`,
            priority: parseInt(priority, 10) || 5
          })
          .select();

        if (insertError) {
          console.error("❌ DATABASE ERROR for chunk:", insertError);
        } else {
          insertedCount++;
        }
      } catch (chunkError) {
        console.error("❌ Error inserting chunk:", chunkError);
      }
    }

    if (insertedCount === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to store any training data chunks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        entriesCreated: insertedCount,
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

// Clean text to remove problematic Unicode characters
function cleanText(text: string): string {
  return text
    .replace(/\u0000/g, "") // Remove null bytes
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "") // Remove non-printable ASCII & control characters
    .replace(/[\u2028\u2029]/g, "") // Remove Unicode line separators
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u0300-\u036F\u1E00-\u1EFF\u2000-\u206F]/g, "") // Keep basic Latin, Latin-1 Supplement, and common extensions
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .normalize("NFC") // Normalize Unicode encoding
    .trim();
}

// Extract text from PDF
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

// OCR Function for Scanned PDFs
async function extractTextWithOCR(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    console.log("📸 Running OCR on PDF...");
    const image = new Uint8Array(pdfArrayBuffer);
    const text = await recognize(image, "eng");

    if (!text.trim()) {
      console.log("⚠️ OCR extracted no text. Returning fallback message.");
      return "OCR could not extract text. The PDF may be too complex for automated text extraction.";
    }

    console.log("✅ OCR Extraction Successful!");
    return text.trim();
  } catch (error) {
    console.error("❌ OCR Extraction Failed:", error);
    return "OCR failed to extract text from this PDF.";
  }
}

// Split content into meaningful chunks with appropriate question-answer pairs
function splitContentIntoChunks(content: string, fileName: string): Array<{question: string, answer: string}> {
  // Remove the file extension for cleaner questions
  const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
  
  // If content is very short, just create one entry
  if (content.length < 500) {
    return [{
      question: `What is in the document "${fileNameWithoutExt}"?`,
      answer: content
    }];
  }
  
  const chunks: Array<{question: string, answer: string}> = [];
  
  // First chunk is always about the whole document
  chunks.push({
    question: `What is in the document "${fileNameWithoutExt}"?`,
    answer: content.length > 2000 
      ? content.substring(0, 2000) + "... (content continues)"
      : content
  });
  
  // Split content into paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  
  if (paragraphs.length > 1) {
    // Group paragraphs into meaningful sections (max 3-4 paragraphs per section)
    const sections: string[] = [];
    let currentSection = "";
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;
      
      if (currentSection.length + paragraph.length > 3000) {
        if (currentSection.length > 0) {
          sections.push(currentSection);
        }
        currentSection = paragraph;
      } else {
        currentSection += currentSection ? "\n\n" + paragraph : paragraph;
      }
    }
    
    if (currentSection.length > 0) {
      sections.push(currentSection);
    }
    
    // Create a question-answer pair for each section
    sections.forEach((section, index) => {
      // Try to identify a title or key phrase for the question
      const firstSentence = section.split('. ')[0].substring(0, 100).trim();
      const sectionNumber = index + 1;
      
      let question = ``;
      if (firstSentence.length < 50 && firstSentence.length > 10) {
        // Use the first sentence as part of the question if it's reasonably sized
        question = `What does "${fileNameWithoutExt}" say about "${firstSentence}"?`;
      } else {
        // Otherwise use a generic section question
        question = `What information is in section ${sectionNumber} of "${fileNameWithoutExt}"?`;
      }
      
      chunks.push({
        question: question,
        answer: section.length > 4000 ? section.substring(0, 4000) + "..." : section
      });
    });
  }
  
  // Look for common patterns like headers or list items to create targeted questions
  const headers = content.match(/(?:^|\n)#+\s+(.+?)(?:\n|$)/g) || [];
  headers.forEach(header => {
    const headerText = header.replace(/^#+\s+/, '').trim();
    if (headerText.length > 5 && headerText.length < 100) {
      // Find the content after this header until the next header
      const headerIndex = content.indexOf(header);
      let nextHeaderIndex = content.indexOf('#', headerIndex + header.length);
      if (nextHeaderIndex === -1) nextHeaderIndex = content.length;
      
      const headerContent = content.substring(headerIndex + header.length, nextHeaderIndex).trim();
      if (headerContent.length > 20) {
        chunks.push({
          question: `What does "${fileNameWithoutExt}" say about "${headerText}"?`,
          answer: headerContent.length > 4000 ? headerContent.substring(0, 4000) + "..." : headerContent
        });
      }
    }
  });
  
  // Ensure we return a reasonable number of chunks
  return chunks.slice(0, Math.min(chunks.length, 10)); // Limit to 10 chunks maximum
}
