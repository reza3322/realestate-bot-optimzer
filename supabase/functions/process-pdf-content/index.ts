
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
      // For PDFs, use a more robust text extraction approach
      try {
        // Convert ArrayBuffer to Uint8Array if needed
        let fileBytes;
        if (fileData instanceof ArrayBuffer) {
          fileBytes = new Uint8Array(fileData);
        } else if (ArrayBuffer.isView(fileData)) {
          fileBytes = new Uint8Array(fileData.buffer);
        } else if (typeof fileData.arrayBuffer === 'function') {
          // Handle Response or Blob type
          const buffer = await fileData.arrayBuffer();
          fileBytes = new Uint8Array(buffer);
        } else {
          throw new Error(`Unsupported file data type: ${typeof fileData}`);
        }
        
        // Simple PDF text extraction using byte patterns
        // This is a basic approach that looks for text objects in the PDF
        const pdfText = new TextDecoder().decode(fileBytes);
        
        // Extract text content between BT (Begin Text) and ET (End Text) markers
        const textMarkers = [];
        let startIndex = 0;
        
        while ((startIndex = pdfText.indexOf('BT', startIndex)) !== -1) {
          const endIndex = pdfText.indexOf('ET', startIndex);
          if (endIndex === -1) break;
          
          textMarkers.push({
            start: startIndex,
            end: endIndex + 2, // +2 to include 'ET'
            content: pdfText.substring(startIndex, endIndex + 2)
          });
          
          startIndex = endIndex + 2;
        }
        
        // Process text blocks to extract readable content
        let cleanText = "";
        for (const marker of textMarkers) {
          // Extract text between parentheses which often contains the actual content
          const matches = marker.content.match(/\((.*?)\)/g);
          if (matches) {
            for (const match of matches) {
              // Remove the parentheses and handle basic PDF escape sequences
              let text = match.substring(1, match.length - 1)
                .replace(/\\r/g, '\r')
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\\\/g, '\\')
                .replace(/\\\(/g, '(')
                .replace(/\\\)/g, ')');
              
              cleanText += text + ' ';
            }
          }
        }
        
        // If the extraction above didn't yield much, try a fallback method
        if (cleanText.trim().length < 100) {
          console.log("⚠️ Primary extraction yielded little text, trying fallback method");
          
          // Look for text following Tj or TJ operators which display text in PDFs
          const tjMatches = pdfText.match(/\([^\)]+\)\s*(Tj|TJ)/g);
          if (tjMatches) {
            cleanText = tjMatches.map(match => {
              // Extract just the text part without the Tj/TJ operator
              return match.match(/\(([^\)]+)\)/)?.[1] || '';
            }).join(' ');
          }
        }
        
        // Final cleanup
        extractedText = cleanText
          .replace(/\s+/g, ' ')  // Replace multiple spaces with a single space
          .trim();
        
        console.log(`📝 Extracted text length: ${extractedText.length} characters`);
        console.log(`📝 Sample text: ${extractedText.substring(0, 150)}...`);
        
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
        if (fileData instanceof ArrayBuffer || ArrayBuffer.isView(fileData)) {
          const decoder = new TextDecoder('utf-8');
          extractedText = decoder.decode(fileData);
        } else if (typeof fileData.text === 'function') {
          // Handle Response type
          extractedText = await fileData.text();
        } else {
          throw new Error(`Unsupported text file data type: ${typeof fileData}`);
        }
        
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
