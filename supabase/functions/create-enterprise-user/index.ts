
// Follow this setup guide to integrate the Deno runtime into your application:
// https://deno.com/deploy/docs/serve-function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.33.1';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Create Enterprise User function initialized");

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Request received to create enterprise user");
    
    // Create a Supabase client with the Admin key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get and validate the request payload
    const { email, password, firstName, lastName, plan = 'starter' } = await req.json();
    
    if (!email || !password || !firstName || !lastName) {
      console.error("Missing required fields", { email, firstName, lastName, password: !!password });
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Missing required fields: email, password, firstName, and lastName are required" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log(`Creating user with email: ${email}`);
    
    // Step 1: Create the user with the Supabase auth API
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        plan
      }
    });
    
    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ success: false, error: userError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    console.log("User created successfully, updating role to admin");
    
    // Step 2: Update the user's role to 'admin' in the profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', userData.user.id);
    
    if (profileError) {
      console.error("Error updating user profile role:", profileError);
      // We don't return an error here because the user was already created successfully
      // Just log the error and continue
    }
    
    console.log("Enterprise user creation completed successfully");
    
    return new Response(
      JSON.stringify({ success: true, data: userData }),
      { headers: { ...corsHeaders, 'Content-Type': 'Application/json' }, status: 200 }
    );
    
  } catch (error) {
    console.error("Unexpected error in create-enterprise-user:", error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
