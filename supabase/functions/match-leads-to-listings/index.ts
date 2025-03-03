
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
    const { userId, leadId, automaticNotification = false } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    let lead;
    
    // If a specific lead ID is provided, only match that lead
    if (leadId) {
      const { data: leadData, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('user_id', userId)
        .single()
      
      if (leadError) {
        console.error('Error fetching lead:', leadError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch lead' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      lead = leadData
      
      // Fetch all active listings for this user
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
      
      if (listingsError) {
        console.error('Error fetching listings:', listingsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch listings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      // Match the lead to listings
      const matches = matchLeadToListings(lead, listings || [])
      
      // If automatic notification is requested and we have matches, create notifications
      if (automaticNotification && matches.length > 0) {
        await createMatchNotifications(supabase, userId, lead, matches)
      }
      
      return new Response(
        JSON.stringify({ 
          lead,
          matches,
          match_count: matches.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      // Match all leads for this user
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
      
      if (leadsError) {
        console.error('Error fetching leads:', leadsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch leads' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      // Fetch all active listings for this user
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
      
      if (listingsError) {
        console.error('Error fetching listings:', listingsError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch listings' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      
      // Match each lead to appropriate listings
      const allMatches = []
      
      for (const lead of leads || []) {
        const matches = matchLeadToListings(lead, listings || [])
        
        if (matches.length > 0) {
          allMatches.push({
            lead_id: lead.id,
            lead_name: `${lead.first_name} ${lead.last_name}`,
            matches,
            match_count: matches.length
          })
          
          // If automatic notification is requested, create notifications
          if (automaticNotification) {
            await createMatchNotifications(supabase, userId, lead, matches)
          }
        }
      }
      
      return new Response(
        JSON.stringify({ 
          matches: allMatches,
          total_leads: (leads || []).length,
          leads_with_matches: allMatches.length
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error in match-leads-to-listings:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Function to match a lead to appropriate listings
function matchLeadToListings(lead, listings) {
  const matches = []
  
  // Extract lead preferences
  const budget = lead.budget || Infinity
  const preferredLocation = lead.preferred_location?.toLowerCase()
  const preferredPropertyType = lead.preferred_property_type?.toLowerCase()
  const bedroomsMin = lead.bedrooms_min || 0
  const bedroomsMax = lead.bedrooms_max || Infinity
  const bathroomsMin = lead.bathrooms_min || 0
  const bathroomsMax = lead.bathrooms_max || Infinity
  const squareFeetMin = lead.square_feet_min || 0
  const squareFeetMax = lead.square_feet_max || Infinity
  
  for (const listing of listings) {
    // Check if listing matches lead preferences
    const priceMatch = listing.price <= budget
    const locationMatch = !preferredLocation || listing.location.toLowerCase().includes(preferredLocation)
    const propertyTypeMatch = !preferredPropertyType || listing.property_type?.toLowerCase() === preferredPropertyType
    const bedroomsMatch = (listing.bedrooms >= bedroomsMin && listing.bedrooms <= bedroomsMax)
    const bathroomsMatch = (listing.bathrooms >= bathroomsMin && listing.bathrooms <= bathroomsMax)
    const squareFeetMatch = (listing.square_feet >= squareFeetMin && listing.square_feet <= squareFeetMax)
    
    // Calculate matching score (percentage)
    let matchingCriteria = 0
    let totalCriteria = 0
    
    // Budget is mandatory
    if (priceMatch) matchingCriteria++
    totalCriteria++
    
    // Optional criteria
    if (preferredLocation) {
      totalCriteria++
      if (locationMatch) matchingCriteria++
    }
    
    if (preferredPropertyType) {
      totalCriteria++
      if (propertyTypeMatch) matchingCriteria++
    }
    
    if (bedroomsMin > 0 || bedroomsMax < Infinity) {
      totalCriteria++
      if (bedroomsMatch) matchingCriteria++
    }
    
    if (bathroomsMin > 0 || bathroomsMax < Infinity) {
      totalCriteria++
      if (bathroomsMatch) matchingCriteria++
    }
    
    if (squareFeetMin > 0 || squareFeetMax < Infinity) {
      totalCriteria++
      if (squareFeetMatch) matchingCriteria++
    }
    
    const matchScore = Math.round((matchingCriteria / totalCriteria) * 100)
    
    // Only include listings that match at least the budget constraint
    if (priceMatch) {
      matches.push({
        listing_id: listing.id,
        title: listing.title,
        price: listing.price,
        location: listing.location,
        match_score: matchScore,
        key_matches: {
          price: priceMatch,
          location: locationMatch,
          property_type: propertyTypeMatch,
          bedrooms: bedroomsMatch,
          bathrooms: bathroomsMatch,
          square_feet: squareFeetMatch
        }
      })
    }
  }
  
  // Sort matches by score (descending)
  return matches.sort((a, b) => b.match_score - a.match_score)
}

// Function to create notifications for lead-listing matches
async function createMatchNotifications(supabase, userId, lead, matches) {
  if (matches.length === 0) return
  
  try {
    // Create a notification for each match
    for (const match of matches) {
      if (match.match_score >= 80) { // Only notify for high-quality matches
        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            lead_id: lead.id,
            listing_id: match.listing_id,
            type: 'match_found',
            title: 'New Property Match',
            message: `Found a ${match.match_score}% match between ${lead.first_name} ${lead.last_name} and property: ${match.title}`,
            read: false
          })
      }
    }
    
    // Log the activity
    await supabase
      .from('activities')
      .insert({
        user_id: userId,
        type: 'lead_matching',
        description: `Found ${matches.length} property matches for lead: ${lead.first_name} ${lead.last_name}`
      })
    
  } catch (error) {
    console.error('Error creating match notifications:', error)
  }
}
