
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get request body
    const { userId, properties, source = 'csv' } = await req.json()

    if (!userId || !properties || !Array.isArray(properties)) {
      return new Response(
        JSON.stringify({ error: 'User ID and properties array are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Create import record
    const { data: importRecord, error: importError } = await supabase
      .from('property_imports')
      .insert({
        user_id: userId,
        source,
        source_name: `Manual ${source.toUpperCase()} import`,
        status: 'processing',
        records_total: properties.length
      })
      .select()
      .single()
    
    if (importError) {
      console.error('Error creating import record:', importError)
      return new Response(
        JSON.stringify({ error: 'Failed to initialize import process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }
    
    // Initialize counters
    let successCount = 0
    let failCount = 0
    let errorLog = []
    
    // Process each property
    for (const property of properties) {
      try {
        // Validate required fields
        if (!property.title || !property.price || !property.location) {
          failCount++
          errorLog.push(`Property missing required fields: ${JSON.stringify(property)}`)
          continue
        }
        
        // Add user_id to the property
        const propertyWithUser = {
          ...property,
          user_id: userId
        }
        
        // Insert the property
        const { error: insertError } = await supabase
          .from('listings')
          .insert(propertyWithUser)
        
        if (insertError) {
          console.error('Error inserting property:', insertError)
          failCount++
          errorLog.push(`Error inserting property: ${insertError.message}`)
        } else {
          successCount++
        }
      } catch (error) {
        console.error('Error processing property:', error)
        failCount++
        errorLog.push(`Unexpected error: ${error.message}`)
      }
    }
    
    // Update the import record
    const { error: updateError } = await supabase
      .from('property_imports')
      .update({
        status: 'completed',
        records_imported: successCount,
        records_failed: failCount,
        log: JSON.stringify({
          message: `Import completed. ${successCount} properties imported, ${failCount} failed.`,
          errors: errorLog,
          timestamp: new Date().toISOString()
        })
      })
      .eq('id', importRecord.id)
    
    if (updateError) {
      console.error('Error updating import record:', updateError)
    }
    
    // Log activity
    await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: 'property_import',
        description: `Imported ${successCount} properties from ${source.toUpperCase()}`
      })
    
    return new Response(
      JSON.stringify({
        status: 'completed',
        import_id: importRecord.id,
        properties_imported: successCount,
        properties_failed: failCount,
        total: properties.length,
        errors: errorLog.length > 0 ? errorLog : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing property import:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
