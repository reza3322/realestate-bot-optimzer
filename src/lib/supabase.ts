
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Use hardcoded values for Supabase connection (for development)
const supabaseUrl = 'https://ckgaqkbsnrvccctqxsqv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ2Fxa2JzbnJ2Y2NjdHF4c3F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEwMTEyODksImV4cCI6MjA1NjU4NzI4OX0.z62BR5psK8FBR5lfqbnpbFMfQLKgzFCisqDiuWg4MKM';

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Check if the chatbot_settings table exists
export const createChatbotSettingsTable = async (userId?: string) => {
  try {
    console.log('Attempting to create chatbot_settings table if it doesn\'t exist');
    
    const url = userId ? `create-chatbot-settings?user_id=${userId}` : 'create-chatbot-settings';
    
    // Call the edge function to create the table if needed and fetch user settings if userId is provided
    const { data, error } = await supabase.functions.invoke(url);
    
    if (error) {
      console.error('Error creating chatbot_settings table via edge function:', error);
      return { success: false, error: error };
    }
    
    console.log('Result from create-chatbot-settings edge function:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error in createChatbotSettingsTable:', error);
    return { success: false, error };
  }
};

// Generate chatbot embed script using the database function
export const generateChatbotScript = async (userId: string) => {
  try {
    // Get the current origin for dynamic base URL
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : null;
    
    console.log(`Generating script with userId: ${userId}, origin: ${currentOrigin}`);
    
    // Call the database function to generate the script
    const { data, error } = await supabase
      .rpc('generate_chatbot_script', { 
        user_uuid: userId,
        client_origin: currentOrigin 
      });
    
    if (error) {
      console.error('Error generating chatbot script:', error);
      return { script: null, error };
    }
    
    console.log('Generated chatbot script:', data);
    return { script: data, error: null };
  } catch (error) {
    console.error('Error in generateChatbotScript:', error);
    return { script: null, error };
  }
};

// Authentication functions
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    toast.error(error.message || 'Failed to sign in');
    return { data, error };
  }
  
  return { data, error };
};

export const signInWithGoogle = async () => {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
};

export const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        plan: 'starter'
      }
    }
  });
  
  if (error) {
    toast.error(error.message || 'Failed to create account');
    return { data, error };
  }
  
  toast.success("Account created successfully! Please check your email to confirm your account.");
  
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    toast.error(error.message || 'Failed to sign out');
  }
  
  return { error };
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  
  if (error) {
    toast.error(error.message || 'Failed to send password reset email');
  } else {
    toast.success('Password reset instructions sent to your email');
  }
  
  return { error };
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

// User data functions
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching user profile:', error);
  }
  
  return { data, error };
};

// Get user role from profiles table
export const getUserRole = async (userId: string) => {
  console.log("Fetching role for user ID:", userId);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
    
  if (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
  
  console.log("User role data:", data);
  return data?.role || null;
};

// Update user profile in the database
export const updateUserProfile = async (userId: string, updates: any) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
    
  if (error) {
    toast.error(error.message || 'Failed to update profile');
  } else {
    toast.success('Profile updated successfully');
  }
  
  return { data, error };
};

// Lead management functions
export const getLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching leads:', error);
  }
  
  return { data: data || [], error };
};

export const addLead = async (lead: any) => {
  const { data, error } = await supabase
    .from('leads')
    .insert([lead]);
    
  if (error) {
    toast.error(error.message || 'Failed to add lead');
  } else {
    toast.success('Lead added successfully');
  }
  
  return { data, error };
};

export const updateLead = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id);
    
  if (error) {
    toast.error(error.message || 'Failed to update lead');
  } else {
    toast.success('Lead updated successfully');
  }
  
  return { data, error };
};

// Property management functions
export const getProperties = async () => {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching properties:', error);
  }
  
  return { data: data || [], error };
};

export const addProperty = async (property: any) => {
  const { data, error } = await supabase
    .from('properties')
    .insert([property]);
    
  if (error) {
    toast.error(error.message || 'Failed to add property');
  } else {
    toast.success('Property added successfully');
  }
  
  return { data, error };
};

// Activity tracking
export const getRecentActivities = async (limit = 10) => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) {
    console.error('Error fetching activities:', error);
  }
  
  return { data: data || [], error };
};

export const logActivity = async (activity: any) => {
  const { error } = await supabase
    .from('activities')
    .insert([activity]);
    
  if (error) {
    console.error('Error logging activity:', error);
  }
  
  return { error };
};

// Admin functions
export const createEnterpriseUser = async (email: string, password: string, firstName: string, lastName: string, plan: string = 'starter') => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      toast.error('You must be logged in to perform this action');
      return { success: false, error: 'Not authenticated' };
    }

    // Call the Edge Function to create a user with admin privileges
    const { data, error } = await supabase.functions.invoke('create-enterprise-user', {
      headers: {
        Authorization: `Bearer ${sessionData.session.access_token}`
      },
      body: {
        email,
        password,
        firstName,
        lastName,
        plan
      }
    });
    
    if (error) {
      console.error('Error creating enterprise user:', error);
      toast.error(error.message || 'Failed to create enterprise user');
      return { success: false, error };
    }
    
    toast.success(`Enterprise account created for ${email}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('Error creating enterprise user:', error.message);
    toast.error(error.message || 'Failed to create enterprise user');
    return { success: false, error };
  }
};

// Function to get all users
export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }
    
    return data.map(profile => ({
      id: profile.id,
      email: '', // Email is not stored in profiles for security
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      plan: profile.plan || 'starter',
      created_at: profile.created_at
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    toast.error('Failed to fetch users');
    return [];
  }
};

// New function to get API usage statistics for each user
export const getUserUsageStats = async () => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    // Call the Edge Function to get usage stats
    const { data, error } = await supabase.functions.invoke('get-user-usage-stats', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Error fetching usage stats:', error);
    toast.error('Failed to fetch usage statistics');
    return [];
  }
};

// New function to get system logs for troubleshooting
export const getSystemLogs = async () => {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw new Error('Not authenticated');
    }
    
    // Call the Edge Function to get system logs
    const { data, error } = await supabase.functions.invoke('get-system-logs', {
      headers: {
        Authorization: `Bearer ${session.session.access_token}`
      }
    });
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error: any) {
    console.error('Error fetching system logs:', error);
    toast.error('Failed to fetch system logs');
    return [];
  }
};

// Add a new function to process files and extract content for the chatbot
export const processPdfContent = async (filePath: string, userId: string, fileName: string, priority: number = 5) => {
  try {
    console.log(`Processing file: ${filePath} for table: chatbot_training_files`);
    
    // Determine content type based on file extension
    let contentType = "application/octet-stream"; // Default
    if (fileName.toLowerCase().endsWith(".pdf")) {
      contentType = "application/pdf";
    } else if (fileName.toLowerCase().endsWith(".txt")) {
      contentType = "text/plain";
    }
    
    console.log("Content Type being sent:", contentType);
    
    const { data, error } = await supabase.functions.invoke('process-pdf-content', {
      body: {
        filePath,
        userId,
        fileName,
        priority,
        contentType
      }
    });
    
    if (error) {
      console.error('Error processing file:', error);
      toast.error('Failed to process file. Please try again or use a different file format.');
      return { success: false, error };
    }
    
    console.log('File processing result:', data);
    
    if (data.success) {
      toast.success('File processed successfully!');
    } else {
      toast.error(data.error || 'Failed to process file');
    }
    
    return data;
  } catch (error) {
    console.error('Error in processPdfContent:', error);
    toast.error('An unexpected error occurred while processing the file');
    return { success: false, error };
  }
};
