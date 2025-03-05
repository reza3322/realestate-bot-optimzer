
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceRole)

    // Create the chatbot_settings table if it doesn't exist
    const { error } = await supabase
      .rpc('create_chatbot_settings_table_if_not_exists')

    if (error) {
      console.error('Error creating chatbot_settings table:', error)
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Chatbot settings table created or already exists' }),
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
