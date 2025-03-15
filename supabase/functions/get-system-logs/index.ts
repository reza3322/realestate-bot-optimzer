
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 GET-SYSTEM-LOGS FUNCTION CALLED - ENTRY POINT');
  console.log('🔑 Function URL:', req.url);
  console.log('📋 Request method:', req.method);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('⏳ Creating Supabase client and verifying authentication');
    // Create a Supabase client with the Supabase URL and key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the JWT token from the request headers
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 Token received, verifying user');
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    console.log(`✅ User authenticated: ${user.id}`);

    // Get user profile to check if they have admin privileges
    console.log('⏳ Checking user privileges');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin privileges', details: profileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Check if the user has admin privileges
    if (profile.plan !== 'enterprise') {
      console.error(`❌ Insufficient privileges. User plan: ${profile.plan}`);
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges. Only enterprise users can access system logs.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }
    
    console.log('✅ User has enterprise privileges, proceeding to log access');

    // Log the admin action
    console.log('⏳ Recording activity');
    try {
      await supabase.from('activities').insert({
        user_id: user.id,
        action: 'view_system_logs',
        details: 'Viewed system logs',
        created_at: new Date().toISOString()
      });
      console.log('✅ Activity recorded successfully');
    } catch (activityError) {
      console.error('⚠️ Failed to record activity, but continuing:', activityError);
    }

    // Fetch actual logs if in production - currently returning mock data
    console.log('⏳ Retrieving system logs');
    
    // For now, let's add timestamps using Date.now() - some hours ago
    const mockSystemLogs = [
      {
        id: '1',
        created_at: new Date(Date.now() - 3600000).toISOString(),
        user_email: 'user1@example.com',
        event_type: 'authentication',
        message: 'Failed login attempt',
        status: 'warning'
      },
      {
        id: '2',
        created_at: new Date(Date.now() - 7200000).toISOString(),
        user_email: 'admin@example.com',
        event_type: 'admin',
        message: 'Created new user account',
        status: 'success'
      },
      {
        id: '3',
        created_at: new Date(Date.now() - 10800000).toISOString(),
        user_email: 'system',
        event_type: 'system',
        message: 'Database backup completed',
        status: 'success'
      },
      {
        id: '4',
        created_at: new Date(Date.now() - 21600000).toISOString(),
        user_email: 'user2@example.com',
        event_type: 'api',
        message: 'Rate limit exceeded for OpenAI API',
        status: 'error'
      },
      {
        id: '5',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        user_email: 'system',
        event_type: 'maintenance',
        message: 'Scheduled system maintenance',
        status: 'info'
      }
    ];
    
    console.log(`✅ Retrieved ${mockSystemLogs.length} system logs`);
    console.log('🏁 Returning logs to client');

    return new Response(
      JSON.stringify(mockSystemLogs),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
