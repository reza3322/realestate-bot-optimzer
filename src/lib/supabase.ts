
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Use environment variables or fallback to empty string to prevent initialization errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Authentication functions
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
      redirectTo: `${window.location.origin}/dashboard`
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
        last_name: lastName
      }
    }
  });
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password-confirmation`,
  });
};

// Test user functionality for different plans
interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  plan: string;
}

const testUsers: TestUser[] = [
  {
    email: 'starter@example.com',
    password: 'password123',
    firstName: 'Starter',
    lastName: 'User',
    plan: 'starter'
  },
  {
    email: 'pro@example.com',
    password: 'password123',
    firstName: 'Pro',
    lastName: 'User',
    plan: 'professional'
  },
  {
    email: 'enterprise@example.com',
    password: 'password123',
    firstName: 'Enterprise',
    lastName: 'User',
    plan: 'enterprise'
  }
];

export const signInAsTestUser = async (planType: 'starter' | 'professional' | 'enterprise') => {
  try {
    // Find the test user with the requested plan
    const testUser = testUsers.find(user => user.plan === planType);
    
    if (!testUser) {
      throw new Error(`No test user found for plan: ${planType}`);
    }
    
    // Try to sign in first - if that fails, create the test user
    const { data: signInData, error: signInError } = await signIn(testUser.email, testUser.password);
    
    if (signInError) {
      // User doesn't exist, create them
      const { data: signUpData, error: signUpError } = await signUp(
        testUser.email,
        testUser.password,
        testUser.firstName,
        testUser.lastName
      );
      
      if (signUpError) {
        throw signUpError;
      }
      
      // Sign in with the newly created account
      const { data, error } = await signIn(testUser.email, testUser.password);
      
      if (error) {
        throw error;
      }
      
      toast.success(`Created and signed in as ${testUser.firstName} ${testUser.lastName} (${planType.toUpperCase()} plan)`);
      return { data, error: null };
    }
    
    toast.success(`Signed in as ${testUser.firstName} ${testUser.lastName} (${planType.toUpperCase()} plan)`);
    return { data: signInData, error: null };
    
  } catch (error: any) {
    toast.error(`Error signing in as test user: ${error.message}`);
    return { data: null, error };
  }
};
