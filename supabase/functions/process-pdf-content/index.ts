
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get request body and parse JSON
    const requestBody = await req.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(requestBody);
    } catch (parseError) {
      console.error("Error parsing request body:", parseError, "Raw body:", requestBody);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    const { filePath, userId, contentType } = parsedBody;
    
    if (!filePath || !userId || !contentType) {
      console.error("Missing required parameters:", { filePath, userId, contentType });
      throw new Error("Missing required parameters: filePath, userId, and contentType are required");
    }
    
    console.log(`Processing PDF file: ${filePath}, user: ${userId}, type: ${contentType}`);
    
    // Create a Supabase client with the project URL and service_role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Server configuration error: Missing Supabase credentials");
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Downloading file from: ${filePath}`);
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('chatbot_training_files')
      .download(filePath);
    
    if (downloadError) {
      console.error("Error downloading file:", downloadError);
      throw downloadError;
    }
    
    if (!fileData) {
      console.error("No file data downloaded");
      throw new Error("No file data could be downloaded");
    }
    
    console.log("File downloaded successfully, size:", fileData.size);
    
    // Extract the file name and extension from the path
    const fileName = filePath.split('/').pop() || "Unknown File";
    const fileExt = fileName.split('.').pop()?.toLowerCase() || "";
    
    // Create training entries based on the file
    let fileContent = "";
    
    // Extract text content from the file based on its type
    if (fileExt === "pdf") {
      // For now, we'll create placeholder entries since true PDF parsing requires additional libraries
      fileContent = `Content extracted from ${fileName}`;
    } else if (fileExt === "txt" || fileExt === "csv") {
      // For text files, we can get the content directly
      fileContent = await fileData.text();
    } else {
      console.log(`Unsupported file extension: ${fileExt}, treating as text`);
      try {
        fileContent = await fileData.text();
      } catch (textError) {
        console.error("Error extracting text from file:", textError);
        fileContent = `Content from ${fileName} (format not fully supported)`;
      }
    }
    
    // Generate training entries
    const entries = [
      {
        user_id: userId,
        content_type: contentType,
        question: `What information do you have about ${fileName}?`,
        answer: `The file "${fileName}" contains the following information: ${fileContent.substring(0, 500)}${fileContent.length > 500 ? '...' : ''}`,
        category: 'Imported Content',
        priority: 5
      },
      {
        user_id: userId,
        content_type: contentType,
        question: `Tell me about the content in ${fileName}`,
        answer: `Here's a summary of "${fileName}": ${fileContent.substring(0, 500)}${fileContent.length > 500 ? '...' : ''}`,
        category: 'Imported Content',
        priority: 4
      }
    ];
    
    // If it's a CSV file, try to parse it as Q&A pairs
    if (fileExt === "csv") {
      try {
        const lines = fileContent.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const parts = lines[i].split(',');
          if (parts.length >= 2) {
            const question = parts[0].trim();
            const answer = parts[1].trim();
            
            if (question && answer) {
              entries.push({
                user_id: userId,
                content_type: contentType,
                question: question,
                answer: answer,
                category: 'CSV Import',
                priority: 3
              });
            }
          }
        }
      } catch (csvError) {
        console.error("Error parsing CSV content:", csvError);
      }
    }
    
    // If it's a TXT file, try to parse it as alternating Q&A
    if (fileExt === "txt") {
      try {
        const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
        for (let i = 0; i < lines.length - 1; i += 2) {
          const question = lines[i].trim();
          const answer = lines[i + 1]?.trim() || "";
          
          if (question && answer) {
            entries.push({
              user_id: userId,
              content_type: contentType,
              question: question,
              answer: answer,
              category: 'TXT Import',
              priority: 3
            });
          }
        }
      } catch (txtError) {
        console.error("Error parsing TXT content:", txtError);
      }
    }
    
    console.log(`Inserting ${entries.length} training entries`);
    
    // Insert entries in the chatbot_training_data table
    const { data: insertData, error: insertError } = await supabase
      .from('chatbot_training_data')
      .insert(entries)
      .select();
    
    if (insertError) {
      console.error("Error inserting content:", insertError);
      throw insertError;
    }
    
    console.log("File processed successfully, created entries:", insertData?.length || 0);
    
    return new Response(
      JSON.stringify({
        success: true,
        message: "File processed successfully",
        data: insertData,
        entriesCount: entries.length
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error processing file:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});
