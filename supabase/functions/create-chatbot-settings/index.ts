
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API keys from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error('Missing environment variables for Supabase connection')
    }

    console.log('Creating Supabase client with service role key')
    
    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    // Get user_id from the query string if available
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    
    console.log('Calling database function to create/check the chatbot_settings table')
    
    // Call the database function to create/check the table
    const { data, error } = await supabase.rpc('create_chatbot_settings_table_if_not_exists')

    if (error) {
      console.error('Error creating chatbot_settings table:', error)
      throw error
    }

    // If userId is provided, fetch the settings for that user
    let userSettings = null;
    if (userId) {
      console.log(`Fetching settings for user: ${userId}`);
      
      const { data: settingsData, error: settingsError } = await supabase
        .from('chatbot_settings')
        .select('settings')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error('Error fetching user settings:', settingsError);
      } else if (settingsData) {
        userSettings = settingsData.settings;
        console.log('Found user settings:', userSettings);
      } else {
        console.log('No settings found for this user');
      }
    }

    console.log('Result from database function:', data)
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Chatbot settings table checked/created successfully',
        data,
        settings: userSettings
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 400,
      }
    )
  }
})
