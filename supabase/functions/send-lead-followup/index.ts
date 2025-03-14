
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.23.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendFollowupRequest {
  leadId: string;
  automationId: string;
  userId: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Create a Supabase client with the service_role key for admin privileges
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
  
  try {
    // Get request payload
    const { leadId, automationId, userId } = await req.json() as SendFollowupRequest;
    
    if (!leadId || !automationId || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // First, check if lead exists and belongs to this user
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .eq("user_id", userId)
      .single();
    
    if (leadError || !lead) {
      console.error("Error fetching lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found or access denied" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Next, get the automation
    const { data: automation, error: automationError } = await supabase
      .from("marketing_automations")
      .select("*")
      .eq("id", automationId)
      .eq("user_id", userId)
      .single();
    
    if (automationError || !automation) {
      console.error("Error fetching automation:", automationError);
      return new Response(
        JSON.stringify({ error: "Automation not found or access denied" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Insert entry into automation history
    const { data: historyEntry, error: historyError } = await supabase
      .from("automation_history")
      .insert({
        automation_id: automationId,
        lead_id: leadId,
        status: "sent"
      })
      .select()
      .single();
    
    if (historyError) {
      console.error("Error creating history entry:", historyError);
      return new Response(
        JSON.stringify({ error: "Failed to create automation history record" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // Update lead to mark it as in a marketing automation
    const { error: updateError } = await supabase
      .from("leads")
      .update({
        in_marketing_automation: true,
        status: lead.status === "new" ? "contacted" : lead.status
      })
      .eq("id", leadId);
    
    if (updateError) {
      console.error("Error updating lead:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update lead status" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }
    
    // In a real implementation, this is where you would send the actual email
    // For now, we'll just return success
    console.log(`Would send follow-up type ${automation.type} to ${lead.email}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Follow-up sent to ${lead.first_name} ${lead.last_name}`,
        historyId: historyEntry.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
    
  } catch (error) {
    console.error("Error in send-lead-followup:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
