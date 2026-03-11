import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import Home from "./pages/Home";
import Products from "./pages/Products";
import Analysis from "./pages/Analysis";
import Stores from "./pages/Stores";
import Settings from "./pages/Settings";
import Education from "./pages/Education";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Stock from "./pages/Stock";
import Roas from "./pages/Roas";
import Paywall from "./pages/Paywall";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return <>{children}</>;
}

function SubscriptionRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();
  const { isActive, loading: subLoading } = useSubscription();

  if (loading || subLoading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isActive) {
    return <Navigate to="/paywall" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <SubscriptionProvider>
          <StoreProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/paywall" element={<ProtectedRoute><Paywall /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/" element={<SubscriptionRoute><Home /></SubscriptionRoute>} />
                <Route path="/products" element={<SubscriptionRoute><Products /></SubscriptionRoute>} />
                <Route path="/analysis" element={<SubscriptionRoute><Analysis /></SubscriptionRoute>} />
                <Route path="/stores" element={<SubscriptionRoute><Stores /></SubscriptionRoute>} />
                <Route path="/education" element={<SubscriptionRoute><Education /></SubscriptionRoute>} />
                <Route path="/stock" element={<SubscriptionRoute><Stock /></SubscriptionRoute>} />
                <Route path="/roas" element={<SubscriptionRoute><Roas /></SubscriptionRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </StoreProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
