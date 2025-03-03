
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Supabase URL and key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the JWT token from the request headers
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: authError?.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Get user profile to check if they have admin privileges
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin privileges', details: profileError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Check if the user has admin privileges
    if (profile.plan !== 'enterprise') {
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges. Only enterprise users can access this data.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Log the admin action
    await supabase.from('activities').insert({
      user_id: user.id,
      action: 'view_usage_stats',
      details: 'Viewed user usage statistics',
      created_at: new Date().toISOString()
    });

    // Return mock data for now
    // In a real application, you would query your database for actual usage data
    const mockUsageStats = [
      {
        user_id: '1',
        email: 'user1@example.com',
        first_name: 'John',
        last_name: 'Doe',
        chatbot_calls: 152,
        openai_tokens: 25430,
        last_activity: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        user_id: '2',
        email: 'user2@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        chatbot_calls: 87,
        openai_tokens: 12980,
        last_activity: new Date(Date.now() - 86400000).toISOString() // 1 day ago
      },
      {
        user_id: '3',
        email: 'user3@example.com',
        first_name: 'Mike',
        last_name: 'Johnson',
        chatbot_calls: 203,
        openai_tokens: 45120,
        last_activity: new Date(Date.now() - 7200000).toISOString() // 2 hours ago
      }
    ];

    return new Response(
      JSON.stringify(mockUsageStats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Unexpected error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
})
