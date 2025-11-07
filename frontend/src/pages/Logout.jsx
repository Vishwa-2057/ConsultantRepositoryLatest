import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, activityLogAPI } from "@/services/api";
import { getCurrentUser } from "@/utils/roleUtils";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      // Get user info BEFORE clearing anything
      const currentUser = getCurrentUser();
      
      // Make backend logout API call FIRST (this logs the activity on backend)
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Backend logout failed:', error);
        // Continue with logout even if backend call fails
      }
      
      // Clear authentication state
      authAPI.clearToken();
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new Event('auth-changed'));
      
      // Navigate to login
      navigate('/login', { replace: true });
    };

    handleLogout();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="text-sm text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
};

export default Logout;


