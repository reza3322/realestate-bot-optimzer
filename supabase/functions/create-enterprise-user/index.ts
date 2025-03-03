
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

    // Get user profile to check if they have admin privileges (this is a simplified check)
    // In a real application, you would have a more robust role-based system
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

    // Check if the user has admin privileges (enterprise plan for this example)
    // You would typically have a dedicated admin role field in your profiles table
    if (profile.plan !== 'enterprise') {
      return new Response(
        JSON.stringify({ error: 'Insufficient privileges. Only enterprise users can perform this action.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // Parse the request body
    const { email, password, firstName, lastName, plan } = await req.json();

    if (!email || !password || !firstName || !lastName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create the user using the admin API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        plan: plan || 'starter'
      }
    });

    if (userError) {
      console.error('Error creating user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to create user', details: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Log the admin action for auditing
    await supabase.from('activities').insert({
      user_id: user.id,
      action: 'create_user',
      details: `Created user ${email} with ${plan || 'starter'} plan`,
      target_id: userData.user.id,
      created_at: new Date().toISOString()
    });

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${email} created successfully`,
        user: {
          id: userData.user.id,
          email: userData.user.email,
          plan: plan || 'starter'
        }
      }),
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
