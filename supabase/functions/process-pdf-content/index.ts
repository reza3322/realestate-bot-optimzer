
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.36.0";
import { corsHeaders } from "../_shared/cors.ts";

// Define the interface for request body
interface RequestBody {
  filePath: string;
  userId: string;
  contentType: string;
  fileName: string;
}

export default async function handler(req: Request) {
  return new Response(JSON.stringify({ success: true, message: "Function overwritten!" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

// ✅ Handle CORS Preflight Requests
Deno.serve(async (req) => {
  console.log(`🔄 Request received: ${req.method}`);

  if (req.method === "OPTIONS") {
    console.log("🟢 Handling CORS preflight request...");
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
      status: 204,
    });
  }

  try {
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "PDF processing has been disabled",
        note: "This functionality has been removed from the edge function"
      }),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          "Content-Type": "application/json" 
        } 
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
