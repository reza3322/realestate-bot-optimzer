import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Use environment variables or fallback to empty string to prevent initialization errors
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Create client anyway for future use if credentials are provided
export const supabase = createClient(supabaseUrl, supabaseKey);

// Mock user data for local testing
interface MockUser {
  id: string;
  email: string;
  password: string;
  user_metadata: {
    first_name: string;
    last_name: string;
    plan: string;
  };
}

// Mock database of users
const mockUsers: MockUser[] = [
  {
    id: '1',
    email: 'starter@example.com',
    password: 'password123',
    user_metadata: {
      first_name: 'Starter',
      last_name: 'User',
      plan: 'starter'
    }
  },
  {
    id: '2',
    email: 'pro@example.com',
    password: 'password123',
    user_metadata: {
      first_name: 'Pro',
      last_name: 'User',
      plan: 'professional'
    }
  },
  {
    id: '3',
    email: 'enterprise@example.com',
    password: 'password123',
    user_metadata: {
      first_name: 'Enterprise',
      last_name: 'User',
      plan: 'enterprise'
    }
  }
];

// Mock local storage key for session
const LOCAL_STORAGE_KEY = 'mock_supabase_session';

// Helper to get current session from localStorage
const getStoredSession = () => {
  const storedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (storedSession) {
    try {
      return JSON.parse(storedSession);
    } catch (e) {
      console.error('Error parsing stored session:', e);
    }
  }
  return null;
};

// Authentication functions using mock data
export const signIn = async (email: string, password: string) => {
  console.log('Attempting mock sign in for:', email);
  
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    const session = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      }
    };
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(session));
    
    return {
      data: { session },
      error: null
    };
  }
  
  return {
    data: { session: null },
    error: { message: 'Invalid email or password' }
  };
};

export const signInWithGoogle = async () => {
  toast.info('Google sign-in would redirect to Google in a real app.');
  
  // For demo, auto sign in as Pro user
  return signIn('pro@example.com', 'password123');
};

export const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
  console.log('Mock sign up for:', email);
  
  // Check if user already exists
  if (mockUsers.some(u => u.email === email)) {
    return {
      data: null,
      error: { message: 'User already registered' }
    };
  }
  
  // Create a new mock user with starter plan
  const newUser = {
    id: String(mockUsers.length + 1),
    email,
    password,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      plan: 'starter'
    }
  };
  
  // Add to mock database
  mockUsers.push(newUser);
  
  return {
    data: { user: newUser },
    error: null
  };
};

export const signOut = async () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  return { error: null };
};

export const resetPassword = async (email: string) => {
  toast.success(`Password reset email would be sent to ${email} in a real app.`);
  return { data: {}, error: null };
};

// Get current session (for checking auth state)
export const getSession = async () => {
  const session = getStoredSession();
  return { data: { session }, error: null };
};

// Mock auth listener
export const onAuthStateChange = (callback: (event: string, session: any) => void) => {
  // Initial check
  const session = getStoredSession();
  callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  
  // This would normally set up a listener, but we'll keep it simple
  return {
    data: {
      subscription: {
        unsubscribe: () => {}
      }
    }
  };
};

// Test user functionality
export const signInAsTestUser = async (planType: 'starter' | 'professional' | 'enterprise') => {
  try {
    let email;
    
    switch (planType) {
      case 'professional':
        email = 'pro@example.com';
        break;
      case 'enterprise':
        email = 'enterprise@example.com';
        break;
      default:
        email = 'starter@example.com';
    }
    
    const { data, error } = await signIn(email, 'password123');
    
    if (error) {
      throw error;
    }
    
    toast.success(`Signed in as test ${planType.toUpperCase()} user`);
    return { data, error: null };
    
  } catch (error: any) {
    toast.error(`Error signing in as test user: ${error.message}`);
    return { data: null, error };
  }
};
