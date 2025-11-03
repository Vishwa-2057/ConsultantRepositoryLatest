import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, activityLogAPI } from "@/services/api";
import { getCurrentUser } from "@/utils/roleUtils";
import { LogOut, CheckCircle } from "lucide-react";

const Logout = () => {
  const navigate = useNavigate();
  const [isComplete, setIsComplete] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const handleLogout = async () => {
      // Get user info from sessionStorage if it was saved before clearing
      let currentUser = getCurrentUser();
      
      // If no user in localStorage (already cleared), try to get from API token
      if (!currentUser) {
        try {
          // Try to get user info from session storage backup if available
          const backupUser = sessionStorage.getItem('logoutUser');
          if (backupUser) {
            currentUser = JSON.parse(backupUser);
            sessionStorage.removeItem('logoutUser');
          }
        } catch (error) {
          // Silently continue
        }
      }
      
      // Create activity log for logout
      if (currentUser) {
        try {
          const logoutActivityLog = {
            activityType: 'logout',
            userId: currentUser?.id || currentUser?._id,
            userName: currentUser?.fullName || currentUser?.name,
            userRole: currentUser?.role,
            userEmail: currentUser?.email,
            timestamp: new Date().toISOString(),
            description: `${currentUser?.fullName || currentUser?.name} logged out`,
            details: {
              logoutReason: 'User initiated logout',
              sessionDuration: null
            }
          };
          
          // Create activity log in MongoDB
          await activityLogAPI.create(logoutActivityLog);
        } catch (error) {
          // Silently continue with logout even if logging fails
        }
      }
      
      // Wait for initial animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Show success state
      setIsComplete(true);
      
      // Wait for success animation
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Start fade out
      setFadeOut(true);
      
      // Clear authentication state (in case not already cleared)
      authAPI.clearToken();
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new Event('auth-changed'));
      
      // Wait for fade out, then navigate
      await new Promise(resolve => setTimeout(resolve, 600));
      navigate('/login', { replace: true });
      
      // Make API call in background
      try {
        await authAPI.logout();
      } catch (error) {
        // Silently ignore - user is already logged out locally
      }
    };

    handleLogout();
  }, [navigate]);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br from-blue-950 via-slate-900 to-blue-950 flex items-center justify-center relative overflow-hidden transition-opacity duration-600 ${
      fadeOut ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }}></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }}></div>
      </div>

      {/* Main content */}
      <div className={`relative z-10 transition-all duration-700 ease-out ${
        isComplete ? 'scale-110' : 'scale-100'
      }`}>
        <div className="relative">
          {/* Glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${
            isComplete ? 'from-green-500/20 to-emerald-500/20' : 'from-blue-500/20 to-cyan-500/20'
          } rounded-full blur-2xl transition-all duration-700`}></div>
          
          {/* Main circle container */}
          <div className="relative bg-white/5 backdrop-blur-2xl rounded-full p-8 border border-white/10 shadow-2xl">
            {/* Animated ring */}
            <div className="relative w-48 h-48">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                {/* Background ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                  fill="none"
                />
                
                {/* Animated gradient ring */}
                <circle
                  cx="100"
                  cy="100"
                  r="85"
                  stroke={isComplete ? 'url(#successGradient)' : 'url(#loadingGradient)'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="534"
                  className={`transition-all duration-700 ${
                    isComplete ? 'animate-none' : 'animate-spin-slow'
                  }`}
                  style={{
                    strokeDashoffset: isComplete ? 0 : 200,
                    animationDuration: '2s'
                  }}
                />
                
                {/* Gradient definitions */}
                <defs>
                  <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                    <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                  </linearGradient>
                  <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center icon with smooth transition */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`relative transition-all duration-500 ${
                  isComplete ? 'scale-100 rotate-0' : 'scale-90 -rotate-12'
                }`}>
                  {!isComplete ? (
                    <>
                      <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse"></div>
                      <LogOut className="w-20 h-20 text-blue-400 relative" />
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-green-500/40 rounded-full blur-xl"></div>
                      <CheckCircle className="w-20 h-20 text-green-400 relative animate-in zoom-in duration-500" />
                      {/* Success particles */}
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-2 h-2 bg-green-400 rounded-full animate-ping"
                          style={{
                            top: `${50 + 40 * Math.sin((i * Math.PI * 2) / 8)}%`,
                            left: `${50 + 40 * Math.cos((i * Math.PI * 2) / 8)}%`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: '1s'
                          }}
                        ></div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Text content */}
        <div className={`text-center mt-8 transition-all duration-500 ${
          isComplete ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-80'
        }`}>
          <h2 className={`text-4xl font-bold mb-3 transition-colors duration-500 ${
            isComplete ? 'text-green-400' : 'text-blue-400'
          }`}>
            {isComplete ? 'Logged Out' : 'Logging Out'}
          </h2>
          <p className="text-white/60 text-lg font-light">
            {isComplete ? 'See you soon!' : 'Ending your session securely...'}
          </p>
        </div>

        {/* Animated dots indicator */}
        {!isComplete && (
          <div className="flex justify-center gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-blue-400/60 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '1s'
                }}
              ></div>
            ))}
          </div>
        )}
      </div>

      {/* Custom animations */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Logout;


