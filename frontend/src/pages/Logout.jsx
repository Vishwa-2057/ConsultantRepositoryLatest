import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/services/api";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    authAPI.clearToken();
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.dispatchEvent(new Event('auth-changed'));
    navigate('/login', { replace: true });
  }, [navigate]);

  return null;
};

export default Logout;


