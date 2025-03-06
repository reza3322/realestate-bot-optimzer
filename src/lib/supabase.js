
import { createClient } from '@supabase/supabase-js';

// Use environment variables for secure configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ckgaqkbsnrvccctqxsqv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM';

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth functions
export const getSession = async () => {
  return await supabase.auth.getSession();
};

export const getUserProfile = async (userId) => {
  return await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
};

export const getUserRole = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) {
    return 'user';
  }

  return data.role;
};

// Leads functions
export const getLeads = async (limit = null) => {
  let query = supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  return await query;
};

export const getLeadById = async (leadId) => {
  return await supabase
    .from('leads')
    .select('*')
    .eq('id', leadId)
    .single();
};

export const updateLeadStatus = async (leadId, status) => {
  return await supabase
    .from('leads')
    .update({ status })
    .eq('id', leadId);
};

// Properties functions
export const getProperties = async (limit = null) => {
  let query = supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  return await query;
};

export const getPropertyById = async (propertyId) => {
  return await supabase
    .from('properties')
    .select('*')
    .eq('id', propertyId)
    .single();
};

// Activities functions
export const getRecentActivities = async (limit = 5) => {
  return await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
};

// Chatbot functions
export const getChatbotSettings = async (userId) => {
  const { data, error } = await supabase
    .from('chatbot_settings')
    .select('settings')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return { data: null, error };
  }

  return { data: data[0].settings, error: null };
};

export const updateChatbotSettings = async (userId, settings) => {
  // Check if settings already exist for this user
  const { data: existingSettings } = await supabase
    .from('chatbot_settings')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (existingSettings && existingSettings.length > 0) {
    // Update existing settings
    return await supabase
      .from('chatbot_settings')
      .update({ settings })
      .eq('id', existingSettings[0].id);
  } else {
    // Create new settings
    return await supabase
      .from('chatbot_settings')
      .insert([{ user_id: userId, settings }]);
  }
};

// Chatbot conversations functions
export const getChatbotConversations = async (limit = 100, userId = null) => {
  let query = supabase
    .from('chatbot_conversations')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }
  
  if (limit) {
    query = query.limit(limit);
  }

  return await query;
};

// Chatbot training data functions
export const getChatbotTrainingData = async (userId, contentType = null) => {
  let query = supabase
    .from('chatbot_training_data')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: false });

  if (contentType) {
    query = query.eq('content_type', contentType);
  }

  return await query;
};

export const addChatbotTrainingData = async (trainingData) => {
  return await supabase
    .from('chatbot_training_data')
    .insert([trainingData]);
};

export const updateChatbotTrainingData = async (id, updates) => {
  return await supabase
    .from('chatbot_training_data')
    .update(updates)
    .eq('id', id);
};

export const deleteChatbotTrainingData = async (id) => {
  return await supabase
    .from('chatbot_training_data')
    .delete()
    .eq('id', id);
};

// Function to test chatbot with real data
export const testChatbotWithRealData = async (message, userId) => {
  try {
    const response = await supabase.functions.invoke('chatbot-response', {
      body: { message, userId }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error calling chatbot response function:', error);
    throw error;
  }
};

// Export the supabase instance as default
export default supabase;
