import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authAPI, clinicAPI } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, ArrowLeft } from "lucide-react";
import Logo from "@/assets/Images/Logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [activeTab, setActiveTab] = useState("password");
  const [userType, setUserType] = useState("regular"); // "regular" or "clinic"
  const navigate = useNavigate();

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (userType === "clinic") {
        res = await clinicAPI.login({ email: email.trim(), password });
      } else {
        res = await authAPI.login({ email: email.trim(), password });
      }
      
      authAPI.setToken(res.token);
      localStorage.setItem('authToken', res.token);
      localStorage.setItem('authUser', JSON.stringify(res.user || res.doctor || {}));
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first");
      return;
    }
    
    setError("");
    setOtpLoading(true);
    try {
      let res;
      if (userType === "clinic") {
        res = await clinicAPI.requestOTP(email.trim());
      } else {
        res = await authAPI.requestOTP(email.trim());
      }
      setOtpSent(true);
      setOtpTimer(60); // 60 seconds countdown
      startTimer();
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOTPLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let res;
      if (userType === "clinic") {
        res = await clinicAPI.loginWithOTP(email.trim(), otp);
      } else {
        res = await authAPI.loginWithOTP(email.trim(), otp);
      }
      authAPI.setToken(res.token);
      localStorage.setItem('authToken', res.token);
      localStorage.setItem('authUser', JSON.stringify(res.user || res.doctor || {}));
      window.dispatchEvent(new Event('auth-changed'));
      navigate('/');
    } catch (err) {
      setError(err.message || 'OTP verification failed');
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

  const resetOTP = () => {
    setOtpSent(false);
    setOtp("");
    setOtpTimer(0);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="grid lg:grid-cols-2 min-h-screen">
        {/* Left Side - Branding/Info */}
        <div className="hidden lg:flex flex-col justify-center items-center p-12 bg-gradient-to-br from-blue-700 via-blue-600 to-teal-500 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10 text-center max-w-lg">
            <div className="mb-8">
              <img src={Logo} alt="Smaart Healthcare Logo" className="w-24 h-24 mx-auto mb-6 object-contain" />
              <h1 className="text-4xl font-bold mb-4">Smaart Healthcare</h1>
              <p className="text-xl text-white/90 leading-relaxed">
                Streamline your healthcare operations with our comprehensive management platform
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center justify-center p-8 lg:p-12">
          <Card className="w-full max-w-lg border-0 shadow-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur">
            <CardHeader className="text-center pb-8">
              <div className="lg:hidden mb-4">
                <img src={Logo} alt="Smaart Healthcare Logo" className="w-16 h-16 mx-auto object-contain" />
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-300 text-lg">
                Sign in to access your healthcare dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {/* User Type Selection */}
              <div className="mb-8">
                <Label className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-4 block">Select Account Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={userType === "regular" ? "default" : "outline"}
                    onClick={() => setUserType("regular")}
                    className={`h-12 text-base font-medium transition-all duration-200 ${userType === "regular" 
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg" 
                      : "border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300"
                    }`}
                  >
                    Healthcare Staff
                  </Button>
                  <Button
                    type="button"
                    variant={userType === "clinic" ? "default" : "outline"}
                    onClick={() => setUserType("clinic")}
                    className={`h-12 text-base font-medium transition-all duration-200 ${userType === "clinic" 
                      ? "bg-purple-600 hover:bg-purple-700 text-white shadow-lg" 
                      : "border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300"
                    }`}
                  >
                    Clinic Administrator
                  </Button>
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <TabsTrigger value="password" className="flex items-center gap-2 h-10 text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Lock className="w-4 h-4" />
                    Password Login
                  </TabsTrigger>
                  <TabsTrigger value="otp" className="flex items-center gap-2 h-10 text-base font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    <Mail className="w-4 h-4" />
                    OTP Login
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="password" className="space-y-6 mt-8">
                  <form onSubmit={handlePasswordLogin} className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="email-password" className="text-base font-medium text-gray-700 dark:text-gray-200">Email Address</Label>
                      <Input 
                        id="email-password" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="h-12 text-base border-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 focus-visible:border-blue-500" 
                        placeholder="Enter your email address"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="password" className="text-base font-medium text-gray-700 dark:text-gray-200">Password</Label>
                      <Input 
                        id="password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        className="h-12 text-base border-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 focus-visible:border-blue-500" 
                        placeholder="Enter your password"
                      />
                    </div>
                    {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{error}</p>}
                    <Button 
                      type="submit" 
                      className={`w-full h-12 text-base font-semibold transition-all duration-200 ${userType === "clinic" 
                        ? "bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl"
                        : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
                      }`}
                      disabled={loading}
                    >
                      {loading ? 'Signing in...' : `Sign In as ${userType === "clinic" ? "Clinic Administrator" : "Healthcare Staff"}`}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="otp" className="space-y-6 mt-8">
                  {!otpSent ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <Label htmlFor="email-otp" className="text-base font-medium text-gray-700 dark:text-gray-200">Email Address</Label>
                        <Input 
                          id="email-otp" 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          required 
                          className="h-12 text-base border-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 focus-visible:border-blue-500" 
                          placeholder="Enter your email address"
                        />
                      </div>
                      {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{error}</p>}
                      <Button 
                        onClick={handleRequestOTP}
                        className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                        disabled={otpLoading || !email.trim()}
                      >
                        {otpLoading ? 'Sending OTP...' : 'Send Verification Code'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                          <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Check your email</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            We've sent a 6-digit verification code to<br />
                            <strong className="text-blue-600 dark:text-blue-400">{email}</strong>
                          </p>
                        </div>
                      </div>
                      
                      <form onSubmit={handleOTPLogin} className="space-y-6">
                        <div className="space-y-3">
                          <Label htmlFor="otp" className="text-base font-medium text-gray-700 dark:text-gray-200">Verification Code</Label>
                          <Input 
                            id="otp" 
                            type="text" 
                            value={otp} 
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            required 
                            className="h-12 text-center text-xl tracking-[0.5em] border-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 focus-visible:border-blue-500 font-mono" 
                          />
                        </div>
                        
                        {otpTimer > 0 && (
                          <p className="text-sm text-blue-600 dark:text-blue-400 text-center bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                            Resend available in {otpTimer} seconds
                          </p>
                        )}
                        
                        {error && <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">{error}</p>}
                        
                        <div className="space-y-3">
                          <Button 
                            type="submit" 
                            className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                            disabled={loading || otp.length !== 6}
                          >
                            {loading ? 'Verifying...' : 'Verify & Sign In'}
                          </Button>
                          
                          <div className="flex gap-3">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleRequestOTP}
                              disabled={otpLoading || otpTimer > 0}
                              className="flex-1 h-11 border-2"
                            >
                              {otpLoading ? 'Sending...' : 'Resend Code'}
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={resetOTP}
                              className="flex-1 h-11 border-2"
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Back
                            </Button>
                          </div>
                        </div>
                      </form>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

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
  );
};

export default Login;


