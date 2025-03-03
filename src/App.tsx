
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getSession } from '@/lib/supabase';
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

  useEffect(() => {
    // Check current auth status
    const checkSession = async () => {
      try {
        const { data: { session } } = await getSession();
        setUser(session?.user || null);
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

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
    
    if (!user) {
      return <Navigate to="/auth" replace />;
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
            <Route path="/auth" element={<Auth />} />
            <Route path="/admin" element={<Admin />} />
            
            {/* Protected routes */}
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
