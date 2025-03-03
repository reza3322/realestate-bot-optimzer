import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
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

// Component to handle authenticated routes
const AuthenticatedRoute = ({ children, requiredRole = null }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // First check localStorage for faster response
        const cachedRole = localStorage.getItem('userRole');
        
        // Check session
        const { data: { session } } = await getSession();
        
        if (!session) {
          console.log("No active session found, redirecting to auth");
          setIsAuthenticated(false);
          setIsLoading(false);
          // Only navigate if we're not already on the auth page
          if (location.pathname !== '/auth') {
            navigate('/auth', { replace: true });
          }
          return;
        }
        
        // We have a session, so user is authenticated
        setIsAuthenticated(true);
        
        // Get user role if needed for role-based access
        if (requiredRole) {
          // Use cached role from localStorage if available
          if (cachedRole) {
            console.log("Using cached role from localStorage:", cachedRole);
            setUserRole(cachedRole);
            
            // If required role doesn't match, redirect
            if (requiredRole && cachedRole !== requiredRole) {
              console.log(`Required role ${requiredRole} doesn't match user role ${cachedRole}, redirecting`);
              if (cachedRole === 'admin') {
                navigate('/admin', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }
            
          } else {
            // No cached role, fetch from server
            const role = await getUserRole(session.user.id);
            console.log("Fetched role from server:", role);
            setUserRole(role);
            localStorage.setItem('userRole', role || 'user');
            
            // If required role doesn't match, redirect
            if (requiredRole && role !== requiredRole) {
              console.log(`Required role ${requiredRole} doesn't match user role ${role}, redirecting`);
              if (role === 'admin') {
                navigate('/admin', { replace: true });
              } else {
                navigate('/dashboard', { replace: true });
              }
            }
          }
        }
        
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, requiredRole, location.pathname]);
  
  // Show loading state
  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">
      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
    </div>;
  }
  
  // For role-based access, ensure user has required role
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/auth" replace />;
  }
  
  // If authenticated (and has required role if specified), render children
  if (isAuthenticated) {
    return children;
  }
  
  // Otherwise redirect to auth page
  return <Navigate to="/auth" replace />;
};

const App = () => {
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
            
            {/* Admin route */}
            <Route 
              path="/admin" 
              element={
                <AuthenticatedRoute requiredRole="admin">
                  <Admin />
                </AuthenticatedRoute>
              } 
            />
            
            {/* Authenticated routes */}
            <Route 
              path="/dashboard" 
              element={
                <AuthenticatedRoute>
                  <Dashboard />
                </AuthenticatedRoute>
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
