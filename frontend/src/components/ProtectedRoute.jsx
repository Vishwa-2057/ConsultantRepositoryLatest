import { Navigate } from 'react-router-dom';
import { canAccessRoute, getCurrentUser, isPharmacist } from '@/utils/roleUtils';

const ProtectedRoute = ({ children, routeName, pharmacistRedirect }) => {
  const user = getCurrentUser();
  
  // If user is not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If pharmacist tries to access dashboard, redirect to pharmacist dashboard
  if (pharmacistRedirect && isPharmacist()) {
    return <Navigate to={pharmacistRedirect} replace />;
  }
  
  // If user doesn't have access to this route, redirect to dashboard
  if (!canAccessRoute(routeName)) {
    // Pharmacists should be redirected to their dashboard
    if (isPharmacist()) {
      return <Navigate to="/pharmacist-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
