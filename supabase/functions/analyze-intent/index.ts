
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface IntentRequest {
  message: string;
  userId: string;
  conversationId?: string;
  previousMessages?: any[];
  visitorInfo?: any;
}

interface IntentResponse {
  intent: string;
  confidence: number;
  entities?: Record<string, any>;
  action?: string;
  slots?: Record<string, any>;
  debug_info?: Record<string, any>;
}

serve(async (req) => {
  // Log every request
  console.log("🔍 ANALYZE-INTENT FUNCTION CALLED");
  console.log(`🔍 Request Method: ${req.method}`);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    console.log("🔍 Handling CORS preflight request");
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Log headers for debugging
    console.log("🔍 Request headers:", Object.fromEntries(req.headers.entries()));

    // Parse the request body
    const body = await req.json() as IntentRequest;
    console.log("🔍 Request body:", JSON.stringify(body, null, 2));

    // Validate required fields
    if (!body.message) {
      console.error("❌ Missing required field: message");
      return new Response(
        JSON.stringify({ error: "Missing required field: message" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Unlike search-training-data, we don't need UUID validation here
    // The analyze-intent function works with any userId string

    // Normalize message for intent detection
    const normalizedMessage = body.message.toLowerCase().trim();
    console.log("🔍 Normalized message:", normalizedMessage);

    // Basic intent detection logic
    const intentPatterns = [
      { pattern: /(hi|hello|hey|greetings)/i, intent: "greeting" },
      { pattern: /(bye|goodbye|see you|talk later)/i, intent: "farewell" },
      { pattern: /(thank you|thanks)/i, intent: "thanks" },
      { pattern: /(property|house|home|apartment|condo|real estate)/i, intent: "property_inquiry" },
      { pattern: /(price|cost|afford|budget|money)/i, intent: "price_inquiry" },
      { pattern: /(location|area|neighborhood|where)/i, intent: "location_inquiry" },
      { pattern: /(agent|realtor|broker)/i, intent: "agent_inquiry" },
      { pattern: /(contact|call|email|phone|reach)/i, intent: "contact_request" },
      { pattern: /(schedule|book|appointment|meeting|visit)/i, intent: "appointment_request" },
      { pattern: /(mortgage|loan|financing|payment)/i, intent: "mortgage_inquiry" },
      { pattern: /(buy|purchase|offer)/i, intent: "buying_inquiry" },
      { pattern: /(sell|selling|list|market)/i, intent: "selling_inquiry" },
      { pattern: /(rent|lease|rental)/i, intent: "rental_inquiry" },
      { pattern: /(name|who are you|what are you)/i, intent: "bot_identity" },
      { pattern: /(help|assist|support)/i, intent: "help_request" },
      { pattern: /(feature|amenity|include)/i, intent: "feature_inquiry" },
      { pattern: /(address|street|location)/i, intent: "address_inquiry" },
      { pattern: /(bedroom|bathroom|size|square|footage)/i, intent: "property_details" },
      { pattern: /(company|business|firm|agency)/i, intent: "company_info" },
    ];

    // Find the first matching pattern or default to "general_query"
    let detectedIntent = "general_query";
    let confidence = 0.4; // Default confidence for general queries

    for (const { pattern, intent } of intentPatterns) {
      if (pattern.test(normalizedMessage)) {
        detectedIntent = intent;
        confidence = 0.8; // Higher confidence for pattern matches
        console.log(`🔍 Intent detected: ${intent} with confidence ${confidence}`);
        break;
      }
    }

    // Extract entities (basic implementation)
    const entities: Record<string, any> = {};

    // Extract price-related entities
    const priceMatch = normalizedMessage.match(/(\$[\d,]+|\d+k|\d+ thousand|\d+ million|\d+m)/i);
    if (priceMatch) {
      entities.price = priceMatch[0];
    }

    // Extract location-related entities
    const locationPatterns = [
      /in ([a-z]+ ?[a-z]*)/i,
      /near ([a-z]+ ?[a-z]*)/i,
      /at ([a-z]+ ?[a-z]*)/i,
      /([a-z]+ ?[a-z]*) area/i,
    ];

    for (const pattern of locationPatterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match[1]) {
        entities.location = match[1];
        break;
      }
    }

    // Extract property type entities
    const propertyTypePatterns = [
      /([1-6])-bedroom/i,
      /([1-6]) bedroom/i,
      /([1-6])bed/i,
      /([1-5])-bathroom/i,
      /([1-5]) bathroom/i,
      /([1-5])bath/i,
    ];

    for (const pattern of propertyTypePatterns) {
      const match = normalizedMessage.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1]);
        if (pattern.toString().includes("bed")) {
          entities.bedrooms = num;
        } else if (pattern.toString().includes("bath")) {
          entities.bathrooms = num;
        }
      }
    }

    // Enhanced logging for debug purposes
    console.log("🔍 Intent analysis complete");
    console.log(`🔍 Detected intent: ${detectedIntent}`);
    console.log(`🔍 Confidence: ${confidence}`);
    console.log("🔍 Extracted entities:", entities);

    // Create the response
    const response: IntentResponse = {
      intent: detectedIntent,
      confidence,
      entities: Object.keys(entities).length > 0 ? entities : undefined,
      debug_info: {
        timestamp: new Date().toISOString(),
        message: normalizedMessage,
        userId: body.userId,
        conversationId: body.conversationId,
      }
    };

    console.log("🔍 Response payload:", JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    // Enhanced error logging
    console.error("❌ ERROR IN ANALYZE-INTENT:", error);
    console.error("❌ Error stack:", error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error.message,
        stack: Deno.env.get("DEBUG") === "true" ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
