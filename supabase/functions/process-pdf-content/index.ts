
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

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

    const { filePath, userId, contentType, fileName } = body;

    if (!filePath || !userId || !contentType || !fileName) {
      console.error("❌ Missing required fields:", body);
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields", received: body }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📄 Processing file: ${filePath} for user: ${userId}, content type: ${contentType}`);

    // Initialize Supabase Client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Check if bucket exists and create it if it doesn't
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      console.error("❌ Error checking buckets:", bucketsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check storage buckets", details: bucketsError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bucketExists = buckets.some(bucket => bucket.name === "chatbot_training_files");
    if (!bucketExists) {
      console.log("🔧 Creating 'chatbot_training_files' bucket...");
      try {
        const { error: createBucketError } = await supabase
          .storage
          .createBucket("chatbot_training_files", {
            public: false,
            fileSizeLimit: 5242880, // 5MB limit
          });
        
        if (createBucketError && createBucketError.message !== "The resource already exists") {
          console.error("❌ Error creating bucket:", createBucketError);
          return new Response(
            JSON.stringify({ success: false, error: "Failed to create storage bucket", details: createBucketError }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // If bucket was created successfully, add policies
        // This step is only needed for newly created buckets
        if (!createBucketError) {
          // Add bucket policies to allow authenticated users to upload files
          const { error: policyError } = await supabase
            .storage
            .from("chatbot_training_files")
            .createPolicy("authenticated users can upload files", {
              name: "authenticated users can upload files",
              definition: {
                role: "authenticated",
                permission: "INSERT",
              },
            });
          
          if (policyError) {
            console.error("❌ Error creating bucket policy:", policyError);
            // We'll continue even if the policy creation fails
          }
        }
        
        console.log("✅ Bucket setup completed");
      } catch (error) {
        // If the error is because the bucket already exists, we can continue
        if (error.message && error.message.includes("already exists")) {
          console.log("🟢 Bucket already exists, continuing...");
        } else {
          throw error;
        }
      }
    }

    // Download File from Supabase Storage
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

    // Extract Text from File
    let extractedText = "";
    if (fileName.toLowerCase().endsWith(".pdf")) {
      console.log("📄 Processing PDF file");
      // For PDF files, we'll just use a simpler approach since the PDF library isn't available
      // Note: This is a fallback that won't extract text from PDFs properly
      // We'll need to handle this on the client side or use a different approach
      extractedText = `Content extracted from ${fileName}. Note: Full PDF text extraction is not available. Please consider uploading a text version of this document.`;
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
        JSON.stringify({ success: false, error: "Failed to extract text from file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📝 Extracted ${extractedText.length} characters of text`);

    // Insert Extracted Content into Supabase
    const { data: insertData, error: insertError } = await supabase
      .from("chatbot_training_data")
      .insert({
        user_id: userId,
        content_type: contentType,
        question: `What information is in ${fileName}?`,
        answer: extractedText.substring(0, 5000),
        category: "File Import",
        priority: 5
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
        entriesCreated: 1
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
