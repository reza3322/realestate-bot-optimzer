
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
    // For actual WhatsApp integration, this would handle webhooks from the WhatsApp Business API
    // For now, this is a simplified demo version
    const { message, phone, userId } = await req.json()

    if (!message || !phone) {
      return new Response(
        JSON.stringify({ error: 'Message and phone number are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    console.log(`Processing WhatsApp message from ${phone}: "${message}"`)
    
    // Check if we already have this lead based on phone number
    const { data: existingLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', phone)
      .eq('user_id', userId)
    
    if (leadsError) {
      console.error('Error checking for existing lead:', leadsError)
    }
    
    let leadId = null
    
    if (existingLeads && existingLeads.length > 0) {
      // Use existing lead
      leadId = existingLeads[0].id
      console.log(`Found existing lead: ${existingLeads[0].first_name} ${existingLeads[0].last_name}`)
    } else {
      // Create a new lead from the WhatsApp contact
      const { data: newLead, error: createError } = await supabase
        .from('leads')
        .insert({
          user_id: userId,
          phone,
          first_name: 'WhatsApp',
          last_name: 'Contact',
          email: `whatsapp-${phone}@placeholder.com`,
          source: 'whatsapp',
          status: 'new'
        })
        .select()
        .single()
      
      if (createError) {
        console.error('Error creating new lead:', createError)
      } else {
        leadId = newLead.id
        console.log(`Created new lead from WhatsApp contact: ${phone}`)
      }
    }
    
    // Use the AI chatbot to process the message
    const aiResponse = await processAIMessage(message)
    
    // Store the conversation
    if (leadId) {
      const { error: conversationError } = await supabase
        .from('chatbot_conversations')
        .insert({
          user_id: userId,
          lead_id: leadId,
          message,
          response: aiResponse,
          source: 'whatsapp'
        })
      
      if (conversationError) {
        console.error('Error storing conversation:', conversationError)
      }
    }
    
    // In a real system, this would send the response back to WhatsApp
    return new Response(
      JSON.stringify({
        response: aiResponse,
        lead_id: leadId,
        source: 'whatsapp'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error processing WhatsApp message:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Simple AI message processing function
// In a real implementation, this would call the main AI chatbot function
async function processAIMessage(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your RealHome.AI assistant. How can I help you with your real estate needs today?";
  }
  
  if (lowerMessage.includes('property') || lowerMessage.includes('house') || lowerMessage.includes('home')) {
    return "I'd be happy to help you find a property! Could you tell me what area you're interested in and your budget range?";
  }
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return "Property prices vary based on location, size, and features. If you have a specific area in mind, I can give you more details. What's your budget range?";
  }
  
  if (lowerMessage.includes('agent') || lowerMessage.includes('broker')) {
    return "I can connect you with one of our experienced agents who can help you further. What's the best time for them to call you?";
  }
  
  return "Thank you for your message. To help you better, could you tell me if you're looking to buy, sell, or rent a property?";
}
