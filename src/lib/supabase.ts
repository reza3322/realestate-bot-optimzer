
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Use environment variables for Supabase connection
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication functions using real Supabase
export const signIn = async (email: string, password: string) => {
  return supabase.auth.signInWithPassword({
    email,
    password
  });
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
  return supabase.auth.signUp({
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
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
};

export const getSession = async () => {
  return supabase.auth.getSession();
};

// Create an enterprise user
export const createEnterpriseUser = async (email: string, password: string, firstName: string, lastName: string) => {
  // First, create the user with the normal signUp method
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      plan: 'enterprise'
    }
  });
  
  if (error) {
    toast.error(error.message || 'Failed to create user');
    return false;
  }
  
  // Update the user's plan to enterprise
  // This requires appropriate permissions and might need to be handled by an admin API
  // or serverless function with the right permissions
  
  toast.success(`Enterprise account created for ${email}`);
  return true;
};

// Function to get all users (requires admin privileges)
export const getAllUsers = async () => {
  const { data, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data.users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.user_metadata?.first_name || '',
    lastName: user.user_metadata?.last_name || '',
    plan: user.user_metadata?.plan || 'starter'
  }));
};
