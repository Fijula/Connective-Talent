import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
import Dashboard from './pages/Dashboard';
import AddTalent from './pages/AddTalent';
import CreateOpportunity from './pages/CreateOpportunity';
import AIMatching from './pages/AIMatching';
import SearchTalent from './pages/SearchTalent';
import TalentPool from './pages/TalentPool';
import TalentProfile from './pages/TalentProfile';
import OpportunityView from './pages/OpportunityView';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';
import NotFound from "./pages/NotFound";
import WalkthroughProvider from "./components/WalkthroughProvider";
import WalkthroughDemo from "./components/WalkthroughDemo";
import { RoleBasedRoute } from "./components/RoleBasedRoute";
import MainDashboard from "./components/MainDashboard";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <WalkthroughProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainDashboard />
                </ProtectedRoute>
              } />
              <Route path="/add-talent" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <AddTalent />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/create-opportunity" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <CreateOpportunity />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/ai-matching" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <AIMatching />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/search-talent" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <SearchTalent />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/talent-pool" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <TalentPool />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/talent-profile/:id" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <TalentProfile />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/opportunity/:id" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin', 'manager']}>
                    <OpportunityView />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <RoleBasedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </RoleBasedRoute>
                </ProtectedRoute>
              } />
              <Route path="/user-dashboard" element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              } />
              <Route path="/walkthrough-demo" element={
                <ProtectedRoute>
                  <WalkthroughDemo />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </WalkthroughProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
