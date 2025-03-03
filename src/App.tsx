
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession, getUserRole } from '@/lib/supabase';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Product from "./pages/Product";
import Resources from "./pages/Resources";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

// Create a new query client
const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    // Check current auth status
    const checkSession = async () => {
      try {
        const { data: { session } } = await getSession();
        setUser(session?.user || null);
        
        // If user is authenticated, fetch their role
        if (session?.user) {
          const role = await getUserRole(session.user.id);
          setUserRole(role || 'user');
          console.log("User role:", role);
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const handleStorageChange = (event) => {
      if (event.key === 'mock_supabase_session') {
        checkSession();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Protected route component for general user authentication
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    
    return children;
  };

  // Admin-only route component - only users with admin role can access
  const AdminRoute = ({ children }) => {
    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    
    if (!user) {
      return <Navigate to="/auth" replace />;
    }
    
    // Only allow access if the user has admin role
    if (userRole !== 'admin') {
      return <Navigate to="/dashboard" replace />;
    }
    
    return children;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/product" element={<Product />} />
            <Route path="/resources" element={<Resources />} />
            
            {/* Auth route - redirect to dashboard/admin if already logged in */}
            <Route 
              path="/auth" 
              element={
                loading ? (
                  <div className="flex justify-center items-center h-screen">Loading...</div>
                ) : user ? (
                  userRole === 'admin' ? (
                    <Navigate to="/admin" replace />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )
                ) : (
                  <Auth />
                )
              } 
            />
            
            {/* Admin-only route */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              } 
            />
            
            {/* Protected routes for all authenticated users */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
