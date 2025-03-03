
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Set up CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a Supabase client with the provided credentials
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the user is authenticated and has admin privileges
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header is required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Extract the JWT token
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get user data
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get the user's profile to check if they're an admin
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profileData || profileData.plan !== 'enterprise') {
      console.error('Profile error or not admin:', profileError, profileData);
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('Admin user confirmed, fetching system logs');

    // In a real application, you would query logs from your database
    // For now, we'll generate mock data similar to what we have in the frontend
    const eventTypes = ['login', 'api_call', 'error', 'signup', 'chatbot_interaction'];
    const statuses = ['success', 'warning', 'error'];
    
    // Generate 20 mock log entries
    const logs = Array.from({ length: 20 }, (_, i) => ({
      id: `log-${i}`,
      created_at: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString(),
      user_email: Math.random() > 0.3 ? `user${Math.floor(Math.random() * 10)}@example.com` : null,
      event_type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      message: `Sample log message for ${eventTypes[Math.floor(Math.random() * eventTypes.length)]} event #${i}`,
      status: statuses[Math.floor(Math.random() * statuses.length)]
    })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('Successfully generated', logs.length, 'system logs');

    return new Response(
      JSON.stringify(logs),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error) {
    console.error('Error in get-system-logs function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
