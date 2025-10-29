import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, activityLogAPI } from "@/services/api";
import auditLogger, { AUDIT_EVENTS, RISK_LEVELS, SENSITIVITY_LEVELS } from "@/utils/auditLogger";
import { getCurrentUser } from "@/utils/roleUtils";
import { LogOut, CheckCircle, Loader2, Waves, Sparkles, ArrowRight } from "lucide-react";

const Logout = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('logging-out'); // 'logging-out', 'success', 'redirecting'
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleLogout = async () => {
      // Get user info before clearing
      const currentUser = getCurrentUser();
      
      // Animate progress for logging out stage
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, 20);
      
      // Show logging out animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      clearInterval(progressInterval);
      setProgress(100);
      
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
          
          // Create activity log in MongoDB - DO THIS BEFORE clearing auth
          await activityLogAPI.create(logoutActivityLog);
          
        } catch (error) {
          // Silently continue with logout even if logging fails
          // This is expected to fail sometimes if the user's session has expired
        }
        
        // Wait a bit to ensure the API call completes
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Show success stage
      setStage('success');
      setProgress(0);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show redirecting stage
      setStage('redirecting');
      setProgress(0);
      
      // Animate progress for redirecting
      const redirectProgress = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(redirectProgress);
            return 100;
          }
          return prev + 5;
        });
      }, 20);
      
      // Immediately clear authentication state to hide sidebar
      authAPI.clearToken();
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      window.dispatchEvent(new Event('auth-changed'));
      
      // Small delay to ensure state updates, then navigate
      await new Promise(resolve => setTimeout(resolve, 800));
      clearInterval(redirectProgress);
      navigate('/login', { replace: true });
      
      // Make API call in background to log the logout activity
      try {
        await authAPI.logout();
      } catch (error) {
        // Silently ignore - user is already logged out locally
        // 401 errors are expected since we cleared the token
      }
    };

    handleLogout();
  }, [navigate]);

  // Show animated logout state with new design
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Animated wave background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className={`absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-blue-500/30 to-transparent transition-all duration-1000 ${
            stage === 'logging-out' ? 'translate-y-0' : stage === 'success' ? '-translate-y-32' : '-translate-y-64'
          }`}>
            <Waves className="w-full h-full text-blue-400/20" />
          </div>
        </div>
        
        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full transition-all duration-1000 ${
              stage === 'logging-out' ? 'bg-red-400/20' : stage === 'success' ? 'bg-green-400/20' : 'bg-blue-400/20'
            }`}
            style={{
              width: `${Math.random() * 100 + 50}px`,
              height: `${Math.random() * 100 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              filter: 'blur(40px)'
            }}
          />
        ))}
      </div>
      
      {/* Main card */}
      <div className={`relative z-10 transition-all duration-700 ${
        stage === 'redirecting' ? 'opacity-0 scale-90 -translate-y-8' : 'opacity-100 scale-100 translate-y-0'
      }`}>
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 min-w-[400px]">
          {/* Circular progress ring */}
          <div className="relative w-48 h-48 mx-auto mb-8">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="12"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="100"
                cy="100"
                r="90"
                stroke={stage === 'logging-out' ? 'url(#gradient-red)' : stage === 'success' ? 'url(#gradient-green)' : 'url(#gradient-blue)'}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 90}`}
                strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                className="transition-all duration-300 ease-out"
              />
              {/* Gradient definitions */}
              <defs>
                <linearGradient id="gradient-red" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {stage === 'logging-out' && (
                <div className="relative">
                  <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse"></div>
                  <LogOut className="w-16 h-16 text-red-400 relative animate-pulse" />
                </div>
              )}
              
              {stage === 'success' && (
                <div className="relative animate-in zoom-in duration-500">
                  <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl"></div>
                  <CheckCircle className="w-16 h-16 text-green-400 relative" />
                  <Sparkles className="w-8 h-8 text-yellow-400 absolute -top-2 -right-2 animate-ping" />
                </div>
              )}
              
              {stage === 'redirecting' && (
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse"></div>
                  <ArrowRight className="w-16 h-16 text-blue-400 relative animate-bounce" style={{ animationDuration: '1s' }} />
                </div>
              )}
            </div>
            
            {/* Progress percentage */}
            {stage !== 'success' && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center mt-32">
                  <span className="text-3xl font-bold text-white">{Math.round(progress)}%</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Text content */}
          <div className="text-center space-y-3">
            <h2 className={`text-3xl font-bold transition-all duration-500 ${
              stage === 'logging-out' ? 'text-red-400' :
              stage === 'success' ? 'text-green-400' :
              'text-blue-400'
            }`}>
              {stage === 'logging-out' && 'Logging Out'}
              {stage === 'success' && 'All Done!'}
              {stage === 'redirecting' && 'Redirecting'}
            </h2>
            <p className="text-white/70 text-base">
              {stage === 'logging-out' && 'Securely ending your session...'}
              {stage === 'success' && 'You have been logged out successfully'}
              {stage === 'redirecting' && 'Taking you back to login'}
            </p>
          </div>
          
          {/* Stage indicators */}
          <div className="flex justify-center gap-2 mt-8">
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
              stage === 'logging-out' ? 'bg-red-400 w-8' : 'bg-white/30'
            }`}></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
              stage === 'success' ? 'bg-green-400 w-8' : 'bg-white/30'
            }`}></div>
            <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
              stage === 'redirecting' ? 'bg-blue-400 w-8' : 'bg-white/30'
            }`}></div>
          </div>
        </div>
      </div>
      
      {/* CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          33% { transform: translateY(-20px) translateX(10px); }
          66% { transform: translateY(10px) translateX(-10px); }
        }
      `}</style>
    </div>
  );
};

export default Logout;


