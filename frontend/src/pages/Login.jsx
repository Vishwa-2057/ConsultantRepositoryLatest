import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authAPI } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Shield, ArrowLeft } from "lucide-react";

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
  const navigate = useNavigate();

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await authAPI.login({ email: email.trim(), password });
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
      const res = await authAPI.requestOTP(email.trim());
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
      const res = await authAPI.loginWithOTP(email.trim(), otp);
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
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-teal-50 via-cyan-50 to-white">
      <Card className="w-full max-w-md border border-teal-100/60 shadow-xl backdrop-blur bg-white/80">
        <CardHeader>
          <CardTitle className="text-teal-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Secure Login
          </CardTitle>
          <CardDescription className="text-teal-700">Choose your preferred login method</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </TabsTrigger>
              <TabsTrigger value="otp" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                OTP
              </TabsTrigger>
            </TabsList>

            <TabsContent value="password" className="space-y-4 mt-6">
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-password">Email</Label>
                  <Input 
                    id="email-password" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="focus-visible:ring-teal-600" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="focus-visible:ring-teal-600" 
                  />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700" 
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In with Password'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="otp" className="space-y-4 mt-6">
              {!otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-otp">Email</Label>
                    <Input 
                      id="email-otp" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      className="focus-visible:ring-teal-600" 
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button 
                    onClick={handleRequestOTP}
                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700" 
                    disabled={otpLoading || !email.trim()}
                  >
                    {otpLoading ? 'Sending OTP...' : 'Send OTP to Email'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
                      <Mail className="w-6 h-6 text-teal-600" />
                    </div>
                    <h3 className="font-semibold text-teal-900">Check your email</h3>
                    <p className="text-sm text-teal-700">
                      We've sent a 6-digit verification code to <strong>{email}</strong>
                    </p>
                  </div>
                  
                  <form onSubmit={handleOTPLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otp">Verification Code</Label>
                      <Input 
                        id="otp" 
                        type="text" 
                        value={otp} 
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        required 
                        className="focus-visible:ring-teal-600 text-center text-lg tracking-widest" 
                      />
                    </div>
                    
                    {otpTimer > 0 && (
                      <p className="text-sm text-teal-600 text-center">
                        Resend available in {otpTimer} seconds
                      </p>
                    )}
                    
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    
                    <div className="space-y-2">
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700" 
                        disabled={loading || otp.length !== 6}
                      >
                        {loading ? 'Verifying...' : 'Verify & Sign In'}
                      </Button>
                      
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleRequestOTP}
                          disabled={otpLoading || otpTimer > 0}
                          className="flex-1"
                        >
                          {otpLoading ? 'Sending...' : 'Resend OTP'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={resetOTP}
                          className="flex-1"
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Back
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <p className="text-sm text-teal-700 mt-6 text-center">
            Don&apos;t have an account? <Link to="/register" className="text-teal-700 underline">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;


