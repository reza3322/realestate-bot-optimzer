
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
        
        // First attempt: try to extract text from PDF using a more robust approach
        let textContent = await extractPdfTextImproved(buffer);
        
        // Check if extraction was successful and meaningful
        if (textContent && textContent.length > 100 && !isProbablyBinary(textContent)) {
          extractedText = textContent;
          console.log("✅ Successfully extracted text with primary method");
        } else {
          console.log("⚠️ Primary extraction yielded little text or binary content, trying alternative method");
          
          // Second attempt with alternative method
          textContent = await extractTextAlternativeMethod(buffer);
          
          if (textContent && textContent.length > 100 && !isProbablyBinary(textContent)) {
            extractedText = textContent;
            console.log("✅ Successfully extracted text with alternative method");
          } else {
            console.log("⚠️ All extraction methods failed to get readable text");
            extractedText = "This document appears to be a scanned, encrypted, or image-based PDF. The system could not extract text content. For best results, please upload a text-based PDF or a text file.";
          }
        }
        
        console.log(`📝 Extracted text length: ${extractedText?.length || 0} characters`);
        if (extractedText && extractedText.length > 0) {
          const sampleText = extractedText.substring(0, 150);
          console.log(`📝 Sample text: ${sampleText}`);
          console.log(`📝 Contains binary characters: ${isProbablyBinary(sampleText)}`);
        }
      } catch (pdfError) {
        console.error("❌ Error extracting PDF text:", pdfError);
        extractedText = "Error extracting text from PDF. The file may be corrupt, encrypted, or in an unsupported format.";
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

    // Sanitize text to remove problematic characters before inserting to database
    extractedText = sanitizeTextForPostgres(extractedText);

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

// Function to check if text is likely binary content rather than readable text
function isProbablyBinary(text: string): boolean {
  // Count non-printable characters
  let nonPrintableCount = 0;
  const sampleSize = Math.min(text.length, 500); // Check first 500 chars
  
  for (let i = 0; i < sampleSize; i++) {
    const code = text.charCodeAt(i);
    // Count characters outside normal readable range
    // and special Unicode characters that often appear in binary data conversion
    if (
      (code < 32 && code !== 9 && code !== 10 && code !== 13) || // Not tab, LF, CR
      (code >= 0xD800 && code <= 0xDFFF) || // Surrogate pairs
      code === 0xFFFD // Replacement character
    ) {
      nonPrintableCount++;
    }
  }
  
  // If more than 5% of characters are non-printable, consider it binary
  const ratio = nonPrintableCount / sampleSize;
  console.log(`Binary detection: ${nonPrintableCount} non-printable chars out of ${sampleSize}, ratio: ${ratio}`);
  return ratio > 0.05;
}

// Improved PDF text extraction function
async function extractPdfTextImproved(pdfBytes: ArrayBuffer): Promise<string> {
  // First try with UTF-8 decoding to see if it's plain text
  try {
    const decoder = new TextDecoder('utf-8');
    const pdfText = decoder.decode(pdfBytes);
    
    // Use more robust regex patterns to extract text content
    let extractedText = "";
    
    // Extract text between common PDF text markers
    const textObjectRegex = /BT\s*([^]*?)\s*ET/g;
    const textMatches = [...pdfText.matchAll(textObjectRegex)];
    
    for (const match of textMatches) {
      if (match[1]) {
        // Look for text within parentheses or hex strings
        const contentRegex = /\(([^)]*)\)|<([0-9A-Fa-f]+)>/g;
        let contentMatch;
        
        while ((contentMatch = contentRegex.exec(match[1])) !== null) {
          if (contentMatch[1]) { // Text in parentheses
            extractedText += contentMatch[1] + " ";
          } else if (contentMatch[2]) { // Hex-encoded text
            try {
              // Convert hex to text
              let hexText = "";
              for (let i = 0; i < contentMatch[2].length; i += 2) {
                const hex = contentMatch[2].substr(i, 2);
                hexText += String.fromCharCode(parseInt(hex, 16));
              }
              extractedText += hexText + " ";
            } catch (e) {
              // Ignore conversion errors
            }
          }
        }
      }
    }
    
    // If we found meaningful text
    if (extractedText.length > 100) {
      return cleanupText(extractedText);
    }
    
    // If minimal text was found, this approach could be insufficient
    // Fall back to a simpler extraction method for plain text content
    const textContentRegex = /\(\s*([^)]+)\s*\)\s*Tj/g;
    const simpleMatches = [...pdfText.matchAll(textContentRegex)];
    
    if (simpleMatches.length > 0) {
      extractedText = simpleMatches.map(m => m[1] || "").join(" ");
      return cleanupText(extractedText);
    }
    
    return extractedText;
  } catch (e) {
    console.error("Error in primary PDF extraction:", e);
    return "";
  }
}

// Alternative method for text extraction
async function extractTextAlternativeMethod(pdfBytes: ArrayBuffer): Promise<string> {
  try {
    const decoder = new TextDecoder('utf-8');
    const pdfText = decoder.decode(pdfBytes);
    
    // This method tries to capture any readable text regardless of PDF structure
    let extractedText = "";
    
    // Find all readable text strings (at least 3 letters) within the PDF
    const textRegex = /[\p{L}\p{N}\p{P}\p{Z}]{3,}/gu;
    const matches = pdfText.match(textRegex) || [];
    
    if (matches.length > 0) {
      extractedText = matches.join(" ");
    }
    
    // As a last resort, try to extract anything that looks like words
    if (extractedText.length < 100) {
      const wordRegex = /[a-zA-Z]{2,}/g;
      const wordMatches = pdfText.match(wordRegex) || [];
      
      if (wordMatches.length > 10) { // Only use if we found enough words
        extractedText = wordMatches.join(" ");
      }
    }
    
    return cleanupText(extractedText);
  } catch (e) {
    console.error("Error in alternative PDF extraction:", e);
    return "";
  }
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

// Function to sanitize text for PostgreSQL storage
// This removes null bytes and other problematic characters
function sanitizeTextForPostgres(text: string): string {
  if (!text) return "";
  
  // Remove null bytes (these cause the most issues with PostgreSQL)
  let sanitized = text.replace(/\u0000/g, "");
  
  // Replace other potentially problematic control characters
  sanitized = sanitized.replace(/[\u0001-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
  
  // Handle cases where there might be UTF-16 surrogate pairs incorrectly decoded
  sanitized = sanitized.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, "");
  
  // Filter out any characters that are likely binary data
  sanitized = sanitized.replace(/[^\p{L}\p{N}\p{P}\p{Z}\p{S}\p{M}\n\r\t]/gu, "");
  
  // Limit length to prevent issues with very large texts
  // PostgreSQL text fields have a limit of 1GB, but let's be conservative
  const MAX_LENGTH = 500000; // 500KB
  if (sanitized.length > MAX_LENGTH) {
    console.log(`⚠️ Truncating extracted text from ${sanitized.length} to ${MAX_LENGTH} characters`);
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }
  
  return sanitized;
}
