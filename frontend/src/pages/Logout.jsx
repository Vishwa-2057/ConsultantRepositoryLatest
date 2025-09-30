import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        // Call logout API to log the logout activity
        await authAPI.logout();
      } catch (error) {
        console.error('Logout API call failed:', error);
        // Continue with logout even if API call fails
      } finally {
        // Clear local storage and token regardless of API call result
        authAPI.clearToken();
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.dispatchEvent(new Event('auth-changed'));
        navigate('/login', { replace: true });
      }
    };

    handleLogout();
  }, [navigate]);

  return null;
};

export default Logout;


