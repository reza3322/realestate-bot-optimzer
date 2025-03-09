
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

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

    const { filePath, userId, fileName, priority = 5 } = body;

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
    const { data: fileData, error: downloadError } = await supabase
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

    if (!fileData) {
      console.error("❌ No file data received");
      return new Response(
        JSON.stringify({ success: false, error: "No file data received" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ File downloaded successfully");
    
    let extractedText = "";
    
    // Determine file type from filename
    const fileType = fileName.toLowerCase().endsWith('.pdf') ? 'pdf' : 
                    fileName.toLowerCase().endsWith('.txt') ? 'txt' : 
                    'unknown';
    
    console.log(`📄 File type detected: ${fileType}`);
    
    if (fileType === 'pdf') {
      try {
        // Get file as ArrayBuffer
        const buffer = await fileData.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        
        // Convert PDF to text using a more robust approach
        extractedText = await extractTextFromPdf(bytes);
        
        if (!extractedText || extractedText.trim().length < 100) {
          console.log("⚠️ Primary extraction yielded little text, trying alternative method");
          // Try alternative extraction if the first method didn't yield much
          extractedText = await extractTextAlternativeMethod(bytes);
        }
        
        console.log(`📝 Extracted text length: ${extractedText?.length || 0} characters`);
        if (extractedText && extractedText.length > 0) {
          console.log(`📝 Sample text: ${extractedText.substring(0, 150)}...`);
        }
        
        // If we still couldn't extract meaningful text
        if (!extractedText || extractedText.length < 50) {
          console.log("⚠️ Could not extract meaningful text from PDF");
          extractedText = "This document appears to be a scanned or image-based PDF. The system could not extract text content. For best results, please upload a text-based PDF or a text file.";
        }
      } catch (pdfError) {
        console.error("❌ Error extracting PDF text:", pdfError);
        extractedText = "Error extracting text from PDF. The file may be corrupt or in an unsupported format.";
      }
    } else if (fileType === 'txt') {
      // For text files, simply decode the content
      try {
        const decoder = new TextDecoder('utf-8');
        extractedText = decoder.decode(await fileData.arrayBuffer());
        console.log(`📝 Extracted ${extractedText.length} characters of text from TXT file`);
      } catch (txtError) {
        console.error("❌ Error extracting text from TXT file:", txtError);
        extractedText = "Error extracting text from file. The file may be corrupt or in an unsupported format.";
      }
    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Unsupported file type. Only PDF and TXT files are supported." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No text was extracted from the file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔍 Inserting into chatbot_training_files table...`);

    // Store File Metadata in chatbot_training_files Table
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_files")
      .insert({
        user_id: userId,
        source_file: fileName,
        extracted_text: extractedText,
        category: "File Import",
        priority: parseInt(String(priority), 10) || 5,
        content_type: fileType === 'pdf' ? 'application/pdf' : 'text/plain'
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

// Improved PDF text extraction function
async function extractTextFromPdf(pdfBytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  const pdfText = decoder.decode(pdfBytes);
  
  // Look for text objects in the PDF
  const textObjects = [];
  
  // Pattern matching for PDF text extraction
  // Find text blocks between BT and ET (Begin Text and End Text)
  let index = 0;
  while (true) {
    const btIndex = pdfText.indexOf('BT', index);
    if (btIndex === -1) break;
    
    const etIndex = pdfText.indexOf('ET', btIndex);
    if (etIndex === -1) break;
    
    textObjects.push(pdfText.substring(btIndex, etIndex + 2));
    index = etIndex + 2;
  }
  
  // Extract text from text objects
  let extractedText = '';
  for (const textObj of textObjects) {
    // Extract text from within parentheses or angle brackets (PDF encoding formats)
    const textMatches = textObj.match(/\((.*?)\)|<([0-9A-Fa-f]+)>/g);
    if (textMatches) {
      for (const match of textMatches) {
        if (match.startsWith('(')) {
          // Handle parenthesized text
          const text = match.substring(1, match.length - 1)
            .replace(/\\r/g, '\r')
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')');
          extractedText += text + ' ';
        } else if (match.startsWith('<')) {
          // Handle hex-encoded text
          try {
            const hexString = match.substring(1, match.length - 1);
            // Convert every two hex characters to a byte, then decode as UTF-16BE (PDF standard)
            const bytes = new Uint8Array(hexString.length / 2);
            for (let i = 0; i < hexString.length; i += 2) {
              bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
            }
            extractedText += decoder.decode(bytes) + ' ';
          } catch (e) {
            console.warn("Error decoding hex text:", e);
          }
        }
      }
    }
  }
  
  // Clean up the extracted text
  return cleanupText(extractedText);
}

// Alternative method for text extraction
async function extractTextAlternativeMethod(pdfBytes: Uint8Array): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  const pdfText = decoder.decode(pdfBytes);
  
  // Method 1: Look for Tj and TJ operators (text showing operators)
  const tjMatches = pdfText.match(/\([^\)]+\)\s*(Tj|TJ)/g) || [];
  let tjText = tjMatches.map(match => {
    const contentMatch = match.match(/\(([^\)]+)\)/);
    return contentMatch ? contentMatch[1] : '';
  }).join(' ');
  
  // Method 2: Look for text between parentheses followed by specific PDF operators
  const textBlockRegex = /\(([^\)]+)\)\s*[A-Za-z']{1,3}/g;
  let blockMatches = [];
  let match;
  while ((match = textBlockRegex.exec(pdfText)) !== null) {
    if (match[1] && match[1].trim().length > 0) {
      blockMatches.push(match[1]);
    }
  }
  let blockText = blockMatches.join(' ');
  
  // Choose the method that extracted more text
  let extractedText = tjText.length > blockText.length ? tjText : blockText;
  
  // If both methods failed, try a simpler approach
  if (extractedText.trim().length < 100) {
    // Just extract all text between parentheses that might be visible text
    const simpleTextRegex = /\(([^\)]{2,})\)/g;
    const simpleMatches = [];
    while ((match = simpleTextRegex.exec(pdfText)) !== null) {
      if (match[1] && /[a-zA-Z0-9]{2,}/.test(match[1])) {
        simpleMatches.push(match[1]);
      }
    }
    extractedText = simpleMatches.join(' ');
  }
  
  return cleanupText(extractedText);
}

// Helper function to clean up the extracted text
function cleanupText(text: string): string {
  return text
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\\/g, '\\')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\s+/g, ' ')
    .replace(/^\s+|\s+$/g, '')
    // Replace common encoding artifacts
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€™/g, "'")
    .replace(/â€"/g, "—")
    .replace(/Â/g, "")
    .trim();
}
