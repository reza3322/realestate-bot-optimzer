
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";
import * as pdfjs from "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.js";

// Initialize the PDF.js worker
const pdfjsWorker = await import("https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.js");
// @ts-ignore
globalThis.pdfjsWorker = pdfjsWorker;
pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.js";

interface RequestBody {
  filePath: string;
  userId: string;
  contentType: string;
  fileName: string;
}

// Function to extract text from a PDF file
async function extractPdfText(pdfArrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: pdfArrayBuffer });
    const pdf = await loadingTask.promise;
    
    let completeText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      completeText += strings.join(' ') + '\n';
    }
    
    return completeText;
  } catch (error) {
    console.error("Error extracting PDF text:", error);
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

// Function to generate a question from text
function generateQuestionFromText(text: string, maxLength: number = 150): string {
  // Truncate text if too long
  const truncatedText = text.length > maxLength 
    ? text.substring(0, maxLength) + '...' 
    : text;
  
  // Simple question generation based on content
  if (text.toLowerCase().includes('property') || text.toLowerCase().includes('house') || 
      text.toLowerCase().includes('apartment') || text.toLowerCase().includes('real estate')) {
    return `What can you tell me about this property?`;
  } else if (text.toLowerCase().includes('faq') || text.toLowerCase().includes('question')) {
    return `Can you answer this FAQ?`;
  } else {
    // Try to extract first sentence or meaningful phrase
    const firstSentence = truncatedText.split(/[.!?]/).filter(s => s.trim().length > 0)[0];
    if (firstSentence && firstSentence.length > 5) {
      return `What can you tell me about "${firstSentence.trim()}"?`;
    }
    return `Can you provide information about this content?`;
  }
}

// Process text content into Q&A pairs
async function processTextContent(text: string, userId: string, contentType: string, supabase: any): Promise<number> {
  // Split text into chunks to create meaningful Q&A pairs
  const chunks = text.split(/\n\n+/)
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 10); // Filter out too small chunks
  
  const processedCount = { success: 0, failure: 0 };
  
  for (const chunk of chunks) {
    try {
      // Generate a question for this text chunk
      const question = generateQuestionFromText(chunk);
      
      // Insert into chatbot_training_data
      const { error } = await supabase
        .from('chatbot_training_data')
        .insert({
          user_id: userId,
          content_type: contentType,
          question: question,
          answer: chunk,
          category: 'File Import',
          priority: 5
        });
      
      if (error) {
        console.error("Error inserting training data:", error);
        processedCount.failure++;
      } else {
        processedCount.success++;
      }
    } catch (e) {
      console.error("Error processing chunk:", e);
      processedCount.failure++;
    }
  }
  
  return processedCount.success;
}

Deno.serve(async (req) => {
  console.log(`🔄 Request received: ${req.method}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("🟢 Handling CORS preflight request");
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Max-Age": "86400"
      },
      status: 204 
    });
  }
  
  try {
    console.log("🚀 Processing request body");
    
    if (req.method !== 'POST') {
      console.error(`❌ Unsupported method: ${req.method}`);
      return new Response(
        JSON.stringify({ error: `Unsupported method: ${req.method}` }),
        { 
          status: 405, 
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    const body = await req.json().catch(e => {
      console.error("❌ Failed to parse request body:", e);
      throw new Error("Invalid request body: " + e.message);
    });
    
    const { filePath, userId, contentType, fileName } = body as RequestBody;
    
    if (!filePath || !userId || !contentType || !fileName) {
      console.error("❌ Missing required fields in request");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields", 
          received: { filePath, userId, contentType, fileName } 
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    console.log(`📄 Processing file: ${filePath} for user: ${userId}, content type: ${contentType}`);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("❌ Missing Supabase credentials");
      throw new Error("Server configuration error: Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('chatbot_training_files')
      .download(filePath);
    
    if (downloadError) {
      console.error("❌ Failed to download file:", downloadError);
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }
    
    if (!fileData) {
      console.error("❌ No file data returned");
      throw new Error("No file data returned from storage");
    }
    
    console.log(`✅ File downloaded successfully: ${fileName}`);
    
    let extractedText = '';
    
    // Extract text based on file type
    if (fileName.toLowerCase().endsWith('.pdf')) {
      console.log("📄 Processing PDF file");
      const arrayBuffer = await fileData.arrayBuffer();
      extractedText = await extractPdfText(arrayBuffer);
    } else if (fileName.toLowerCase().endsWith('.txt')) {
      console.log("📄 Processing text file");
      extractedText = await fileData.text();
    } else {
      console.error(`❌ Unsupported file type: ${fileName}`);
      throw new Error(`Unsupported file type: ${fileName}`);
    }
    
    if (!extractedText || extractedText.trim().length === 0) {
      console.error("❌ No text content extracted from file");
      throw new Error("No text content extracted from file");
    }
    
    console.log(`📝 Extracted ${extractedText.length} characters of text`);
    
    // Process the extracted text into Q&A pairs
    const entriesCreated = await processTextContent(extractedText, userId, contentType, supabase);
    
    console.log(`✅ Created ${entriesCreated} training entries`);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `File processed successfully. Created ${entriesCreated} training entries.`,
        entriesCreated
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
    
  } catch (error) {
    console.error("❌ Error processing file:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  }
});
