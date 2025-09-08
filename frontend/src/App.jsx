import { Toaster } from "@/components/ui/toaster.jsx";
import { Toaster as Sonner } from "@/components/ui/sonner.jsx";
import { TooltipProvider } from "@/components/ui/tooltip.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PatientManagement from "./pages/PatientManagement.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Logout from "./pages/Logout.jsx";
import { useEffect, useState } from "react";
import { authAPI } from "@/services/api";
import Teleconsultation from "./pages/Teleconsultation.jsx";
import ReferralSystem from "./pages/ReferralSystem.jsx";
import Billing from "./pages/Billing.jsx";
import CommunityHub from "./pages/CommunityHub.jsx";
import NotFound from "./pages/NotFound.jsx";
import APITest from "./components/APITest.jsx";
import EmailSettings from "./pages/EmailSettings.jsx";

const queryClient = new QueryClient();

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const isAuthed = Boolean(token);

  useEffect(() => {
    const stored = localStorage.getItem('authToken');
    if (stored) authAPI.setToken(stored);
    // Listen for auth changes triggered by login/logout
    const handleAuthChanged = () => {
      const latest = localStorage.getItem('authToken');
      setToken(latest);
      if (latest) {
        authAPI.setToken(latest);
      } else {
        authAPI.clearToken();
      }
    };
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={isAuthed ? <Dashboard /> : <Navigate to="/login" replace />} />
              <Route path="/patients" element={isAuthed ? <PatientManagement /> : <Navigate to="/login" replace />} />
              <Route path="/teleconsultation" element={isAuthed ? <Teleconsultation /> : <Navigate to="/login" replace />} />
              <Route path="/referrals" element={isAuthed ? <ReferralSystem /> : <Navigate to="/login" replace />} />
              <Route path="/billing" element={isAuthed ? <Billing /> : <Navigate to="/login" replace />} />
              <Route path="/community" element={isAuthed ? <CommunityHub /> : <Navigate to="/login" replace />} />
              <Route path="/email-settings" element={isAuthed ? <EmailSettings /> : <Navigate to="/login" replace />} />
              <Route path="/api-test" element={<APITest />} />
              <Route path="/logout" element={<Logout />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
