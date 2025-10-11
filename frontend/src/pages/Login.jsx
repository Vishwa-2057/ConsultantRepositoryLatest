import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, ArrowLeft, CheckCircle, Eye, EyeOff, Sparkles, AlertCircle } from "lucide-react";
import Logo from "@/assets/images/Logo.png";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import { validators, sanitizers } from "@/utils/validation";

const Login = () => {
  const [step, setStep] = useState(1); // 1: Email & Password, 2: OTP Verification
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validate step 1 form
  const validateStep1 = () => {
    const errors = [];
    
    const emailError = validators.required(email, 'Email') || validators.email(email);
    if (emailError) errors.push(emailError);
    
    const passwordError = validators.required(password, 'Password');
    if (passwordError) errors.push(passwordError);
    
    return errors;
  };

  // Step 1: Verify password and get OTP
  const handleStep1 = async (e) => {
    e.preventDefault();
    setError("");
    
    // Client-side validation
    const validationErrors = validateStep1();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await authAPI.loginStep1({ email: sanitizers.email(email), password });
      
      if (res.success && res.requiresOTP) {
        setIsAnimating(true);
        setTimeout(() => {
          setStep(2);
          setOtpTimer(60); // 60 seconds countdown
          startTimer();
          setIsAnimating(false);
        }, 300);
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Validate step 2 form
  const validateStep2 = () => {
    const errors = [];
    
    if (!otp || otp.length !== 6) {
      errors.push('Please enter a valid 6-digit OTP');
    }
    
    if (!/^\d{6}$/.test(otp)) {
      errors.push('OTP must contain only numbers');
    }
    
    return errors;
  };

  // Step 2: Verify OTP and complete login
  const handleStep2 = async (e) => {
    e.preventDefault();
    setError("");
    
    // Client-side validation
    const validationErrors = validateStep2();
    if (validationErrors.length > 0) {
      setError(validationErrors[0]);
      return;
    }
    
    setLoading(true);
    try {
      const res = await authAPI.loginStep2({ email: sanitizers.email(email), otp });
      
      if (res.success) {
        // Use new session management with secure token storage
        await authAPI.setToken(res.token, res.refreshToken, res.expiresIn);
        localStorage.setItem('authUser', JSON.stringify(res.user || {}));
        window.dispatchEvent(new Event('auth-changed'));
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.loginStep1({ email: email.trim(), password });
      
      if (res.success && res.requiresOTP) {
        setOtpTimer(60);
        startTimer();
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetToStep1 = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setStep(1);
      setOtp("");
      setOtpTimer(0);
      setError("");
      setIsAnimating(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-cyan-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-sky-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="grid lg:grid-cols-2 min-h-screen relative z-10">
        {/* Left Side - Enhanced Branding */}
        <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-700 text-white relative overflow-hidden">
          {/* Animated particles */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white/20 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              />
            ))}
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20"></div>
          <div className={`relative z-10 text-center max-w-lg transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="mb-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse"></div>
                <img src={Logo} alt="Smaart Healthcare Logo" className="w-28 h-28 mx-auto relative z-10 object-contain drop-shadow-2xl" />
              </div>
              <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                Smaart Healthcare
              </h1>
              <p className="text-xl text-white/90 leading-relaxed mb-8">
                Streamline your healthcare operations with our comprehensive management platform
              </p>
              <div className="flex items-center justify-center space-x-6 text-white/80">
                <div className="flex items-center space-x-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">Secure</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="text-sm">Reliable</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm">Modern</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Enhanced Login Form */}
        <div className="flex items-center justify-center p-2 lg:p-4">
          <div className={`w-full max-w-lg transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl relative overflow-hidden">
              {/* Card glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-cyan-500/10 opacity-50"></div>
              
              <CardHeader className="text-center pb-2 relative z-10">
                <div className="lg:hidden mb-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-lg animate-pulse"></div>
                    <img src={Logo} alt="Smaart Healthcare Logo" className="w-16 h-16 mx-auto object-contain relative z-10 drop-shadow-lg" />
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-800 dark:from-white dark:via-blue-200 dark:to-cyan-200 bg-clip-text text-transparent mb-2">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-300 text-base">
                  Sign in to access your healthcare dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 relative z-10">

                {/* Step 1: Enhanced Email & Password */}
                {step === 1 && !isAnimating && (
                  <div className="animate-in slide-in-from-right-5 duration-500">
                    <form onSubmit={handleStep1} className="space-y-4">
                      <div className="text-center space-y-1 mb-4">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto relative z-10 shadow-xl">
                            <Lock className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                          Enter Your Credentials
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          Verify your email and password
                        </p>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Email Address
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="email" 
                              type="email" 
                              value={email} 
                              onChange={(e) => setEmail(sanitizers.email(e.target.value))} 
                              required 
                              className="h-10 text-sm border-2 border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all duration-300 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm group-hover:border-blue-300" 
                              placeholder="Enter your email address"
                              autoComplete="email"
                            />
                            <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            Password
                          </Label>
                          <div className="relative group">
                            <Input 
                              id="password" 
                              type={showPassword ? "text" : "password"}
                              value={password} 
                              onChange={(e) => setPassword(e.target.value)} 
                              required 
                              className="h-10 text-sm border-2 border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 transition-all duration-300 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm group-hover:border-blue-300 pr-12" 
                              placeholder="Enter your password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors duration-300"
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setForgotPasswordOpen(true)}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors duration-300 hover:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      
                      {error && (
                        <div className="animate-in slide-in-from-top-2 duration-300">
                          <div className="flex items-center gap-2 text-sm text-red-600 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <p>{error}</p>
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full h-10 text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] text-white border-0"
                        disabled={loading}
                      >
                        {loading ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            <span>Verifying...</span>
                          </div>
                        ) : (
                          'Continue to Verification'
                        )}
                      </Button>
                    </form>
                  </div>
                )}

                {/* Step 2: Enhanced OTP Verification */}
                {step === 2 && !isAnimating && (
                  <div className="animate-in slide-in-from-left-5 duration-500">
                    <div className="space-y-4">
                      <div className="text-center space-y-2">
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
                          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto relative z-10 shadow-xl">
                            <Mail className="w-8 h-8 text-white animate-bounce" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                            Check your email
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                            We've sent a 6-digit verification code to<br />
                            <strong className="text-blue-600 dark:text-blue-400 font-semibold">{email}</strong>
                          </p>
                        </div>
                      </div>
                      
                      <form onSubmit={handleStep2} className="space-y-6">
                        <div className="space-y-4">
                          <Label htmlFor="otp" className="text-base font-semibold text-gray-700 dark:text-gray-200 text-center block">
                            Verification Code
                          </Label>
                          <div className="relative">
                            <Input 
                              id="otp" 
                              type="text" 
                              value={otp} 
                              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                              placeholder="000000"
                              maxLength={6}
                              required 
                              className="h-14 text-center text-2xl tracking-[0.8em] border-2 border-gray-200 dark:border-gray-600 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 font-mono bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-all duration-300" 
                            />
                            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                          </div>
                        </div>
                        
                        {otpTimer > 0 && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <p className="text-sm text-blue-600 dark:text-blue-400 text-center bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm">
                              <span className="font-semibold">Resend available in {otpTimer} seconds</span>
                            </p>
                          </div>
                        )}
                        
                        {error && (
                          <div className="animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <p>{error}</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-4">
                          <Button 
                            type="submit" 
                            className="w-full h-12 text-base font-semibold transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] text-white border-0" 
                            disabled={loading || otp.length !== 6}
                          >
                            {loading ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Verifying...</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <CheckCircle className="w-5 h-5" />
                                <span>Complete Sign In</span>
                              </div>
                            )}
                          </Button>
                          
                          <div className="flex gap-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleResendOTP}
                              disabled={loading || otpTimer > 0}
                              className="flex-1 h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-300"
                            >
                              {loading ? (
                                <div className="flex items-center space-x-2">
                                  <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                  <span>Sending...</span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <Mail className="w-4 h-4" />
                                  <span>Resend Code</span>
                                </div>
                              )}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={resetToStep1}
                              className="flex-1 h-12 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all duration-300"
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Secure healthcare management platform
                </p>
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />
    </div>
  );
};

export default Login;


