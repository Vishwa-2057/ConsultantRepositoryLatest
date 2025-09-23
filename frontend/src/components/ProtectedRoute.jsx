import { Navigate } from 'react-router-dom';
import { canAccessRoute, getCurrentUser } from '@/utils/roleUtils';

const ProtectedRoute = ({ children, routeName }) => {
  const user = getCurrentUser();
  
  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If user doesn't have access to this route, redirect to dashboard
  if (!canAccessRoute(routeName)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
