import { Toaster } from "@/components/ui/toaster.jsx";
import { Toaster as Sonner } from "@/components/ui/sonner.jsx";
import { TooltipProvider } from "@/components/ui/tooltip.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PatientManagement from "./pages/PatientManagement.jsx";
import PatientDetails from "./pages/PatientDetails.jsx";
import AppointmentManagement from "./pages/AppointmentManagement.jsx";
import DoctorsManagement from "./pages/DoctorsManagement.jsx";
import NursesManagement from "./pages/NursesManagement.jsx";
import PharmacistsManagement from "./pages/PharmacistsManagement.jsx";
import PharmacistDashboard from "./pages/PharmacistDashboard.jsx";
import InventoryManagement from "./pages/InventoryManagement.jsx";
import PharmacistPrescriptions from "./pages/PharmacistPrescriptions.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import SuperAdminRegister from "./pages/SuperAdminRegister.jsx";
import Logout from "./pages/Logout.jsx";
import { useEffect, useState } from "react";
import { authAPI } from './services/api';
import sessionManager from './utils/sessionManager';
import Teleconsultation from "./pages/Teleconsultation.jsx";
import Prescriptions from "./pages/Prescriptions.jsx";
import ReferralSystem from "./pages/ReferralSystem.jsx";
import SharedReferral from "./pages/SharedReferral.jsx";
import SlotManagement from "./pages/SlotManagement.jsx";
import Billing from "./pages/Billing.jsx";
import CommunityHub from "./pages/CommunityHub.jsx";
import NotFound from "./pages/NotFound.jsx";
import APITest from "./components/APITest.jsx";
import EmailSettings from "./pages/EmailSettings.jsx";
import ActivityLogs from "./pages/ActivityLogs.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import LabReports from "./pages/LabReports.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import PublicRoute from "./components/PublicRoute.jsx";

const queryClient = new QueryClient();

const App = () => {
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthed = Boolean(token);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Always check for token, even on login/register pages
        // This allows PublicRoute to redirect authenticated users
        const currentToken = await sessionManager.getToken(true); // Skip login check
        setToken(currentToken);
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes triggered by login/logout
    const handleAuthChanged = async () => {
      try {
        // Bypass login page check when auth-changed event fires (user just logged in)
        const latest = await sessionManager.getToken(true);
        setToken(latest);
      } catch (error) {
        console.error('Auth change failed:', error);
        setToken(null);
      }
    };
    
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/login" element={<PublicRoute isAuthed={isAuthed}><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute isAuthed={isAuthed}><Register /></PublicRoute>} />
              <Route path="/superadmin/register" element={<PublicRoute isAuthed={isAuthed}><SuperAdminRegister /></PublicRoute>} />
              <Route path="/" element={isAuthed ? <ProtectedRoute routeName="dashboard" pharmacistRedirect="/pharmacist-dashboard"><Dashboard /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/patients" element={isAuthed ? <ProtectedRoute routeName="patient-management"><PatientManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/patients/:patientId" element={isAuthed ? <ProtectedRoute routeName="patient-management"><PatientDetails /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/appointments" element={isAuthed ? <ProtectedRoute routeName="appointment-management"><AppointmentManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/slot-management" element={isAuthed ? <ProtectedRoute routeName="slot-management"><SlotManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/doctors" element={isAuthed ? <ProtectedRoute routeName="doctors-management"><DoctorsManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/nurses" element={isAuthed ? <ProtectedRoute routeName="nurses-management"><NursesManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/pharmacists" element={isAuthed ? <ProtectedRoute routeName="pharmacists-management"><PharmacistsManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/pharmacist-dashboard" element={isAuthed ? <ProtectedRoute routeName="pharmacist-dashboard"><PharmacistDashboard /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/inventory-management" element={isAuthed ? <ProtectedRoute routeName="inventory-management"><InventoryManagement /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/pharmacist-prescriptions" element={isAuthed ? <ProtectedRoute routeName="pharmacist-prescriptions"><PharmacistPrescriptions /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/teleconsultation" element={isAuthed ? <ProtectedRoute routeName="teleconsultation"><Teleconsultation /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/prescriptions" element={isAuthed ? <ProtectedRoute routeName="prescriptions"><Prescriptions /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/referrals" element={isAuthed ? <ProtectedRoute routeName="referral-system"><ReferralSystem /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/shared-referral/:code" element={<SharedReferral />} />
              <Route path="/invoices" element={isAuthed ? <ProtectedRoute routeName="invoice-management"><Billing /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/billing" element={isAuthed ? <ProtectedRoute routeName="invoice-management"><Billing /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/community" element={isAuthed ? <ProtectedRoute routeName="community-hub"><CommunityHub /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/email-settings" element={isAuthed ? <ProtectedRoute routeName="email-settings"><EmailSettings /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/activity-logs" element={isAuthed ? <ProtectedRoute routeName="activity-logs"><ActivityLogs /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/audit-logs" element={isAuthed ? <ProtectedRoute routeName="audit-logs"><AuditLogs /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/lab-reports" element={isAuthed ? <ProtectedRoute routeName="lab-reports"><LabReports /></ProtectedRoute> : <Navigate to="/login" replace />} />
              <Route path="/compliance" element={isAuthed ? <ProtectedRoute routeName="compliance-alerts"><Dashboard /></ProtectedRoute> : <Navigate to="/login" replace />} />
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
