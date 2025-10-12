import { Navigate } from 'react-router-dom';

/**
 * PublicRoute component - Prevents authenticated users from accessing public pages like login/register
 * Redirects logged-in users to the dashboard
 */
const PublicRoute = ({ children, isAuthed }) => {
  // If user is already logged in, redirect to dashboard
  if (isAuthed) {
    return <Navigate to="/" replace />;
  }
  
  // If not logged in, allow access to public route
  return children;
};

export default PublicRoute;
