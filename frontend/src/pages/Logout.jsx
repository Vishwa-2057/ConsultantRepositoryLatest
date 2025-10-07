import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      // Immediately clear authentication state to hide sidebar
      authAPI.clearToken();
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new Event('auth-changed'));
      
      // Small delay to ensure state updates, then navigate
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 100);
      
      // Make API call in background to log the logout activity
      try {
        await authAPI.logout();
      } catch (error) {
        console.error('Logout API call failed:', error);
        // This is fine - user is already logged out locally
      }
    };

    handleLogout();
  }, [navigate]);

  // Show a brief loading state
  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Logging out...</p>
      </div>
    </div>
  );
};

export default Logout;


