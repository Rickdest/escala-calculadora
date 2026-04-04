import { Toaster as Sonner } from "@/components/ui/sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "@/contexts/StoreContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SubscriptionProvider, useSubscription } from "@/contexts/SubscriptionContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAdmin } from "@/hooks/useAdmin";
import { lazy, Suspense } from "react";

// Lazy-loaded pages
const Home = lazy(() => import("./pages/Home"));
const Products = lazy(() => import("./pages/Products"));
const Stores = lazy(() => import("./pages/Stores"));
const Settings = lazy(() => import("./pages/Settings"));
const Education = lazy(() => import("./pages/Education"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Stock = lazy(() => import("./pages/Stock"));
const Roas = lazy(() => import("./pages/Roas"));
const Paywall = lazy(() => import("./pages/Paywall"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminBanners = lazy(() => import("./pages/AdminBanners"));
const Calculators = lazy(() => import("./pages/Calculators"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const ShopeeCallback = lazy(() => import("./pages/ShopeeCallback"));
const Performance = lazy(() => import("./pages/Performance"));
const PerformanceProductDetail = lazy(() => import("./pages/PerformanceProductDetail"));
const Integracoes = lazy(() => import("./pages/Integracoes"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 10 * 60 * 1000,
      staleTime: 2 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );
}

function ErrorRetry({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground text-sm">Erro ao verificar sua assinatura.</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
      >
        Tentar novamente
      </button>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { status, loading: subLoading, refreshSubscription } = useSubscription();

  if (loading || subLoading || status === 'loading') {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Technical error — show retry, NOT paywall
  if (status === 'error') {
    return <ErrorRetry onRetry={refreshSubscription} />;
  }

  // Only redirect to paywall when backend explicitly says not active
  if (status !== 'active') {
    return <Navigate to="/paywall" replace />;
  }

  return <>{children}</>;
}

function PaywallRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { status, loading: subLoading } = useSubscription();

  if (loading || subLoading || status === 'loading') {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (status === 'active') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  if (authLoading || adminLoading) {
    return <PageLoader />;
  }

  if (!user || !isAdmin) {
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
          <SidebarProvider>
          <StoreProvider>
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                  <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                  <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                  <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
                  
                  <Route path="/stores" element={<ProtectedRoute><Stores /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  <Route path="/education" element={<ProtectedRoute><Education /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/stock" element={<ProtectedRoute><Stock /></ProtectedRoute>} />
                  <Route path="/roas" element={<ProtectedRoute><Roas /></ProtectedRoute>} />
                  <Route path="/performance" element={<ProtectedRoute><Performance /></ProtectedRoute>} />
                  <Route path="/performance/:itemId" element={<ProtectedRoute><PerformanceProductDetail /></ProtectedRoute>} />
                  <Route path="/paywall" element={<PaywallRoute><Paywall /></PaywallRoute>} />
                  <Route path="/shopee-callback" element={<ShopeeCallback />} />
                  <Route path="/admin/banners" element={<AdminRoute><AdminBanners /></AdminRoute>} />
                  <Route path="/calculadoras" element={<ProtectedRoute><Calculators /></ProtectedRoute>} />
                  <Route path="/configuracoes/integracoes" element={<ProtectedRoute><Integracoes /></ProtectedRoute>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              </ErrorBoundary>
            </BrowserRouter>
          </StoreProvider>
          </SidebarProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
