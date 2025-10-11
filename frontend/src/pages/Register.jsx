import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { validators, sanitizers } from "@/utils/validation";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("General Practitioner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    
    const fullNameError = validators.required(fullName, 'Full name') ||
                         validators.minLength(fullName, 2, 'Full name') ||
                         validators.maxLength(fullName, 100, 'Full name');
    if (fullNameError) newErrors.fullName = fullNameError;
    
    const emailError = validators.required(email, 'Email') || validators.email(email);
    if (emailError) newErrors.email = emailError;
    
    const passwordError = validators.required(password, 'Password') ||
                         validators.password(password, true); // Use strong password validation
    if (passwordError) newErrors.password = passwordError;
    
    const specialtyError = validators.required(specialty, 'Specialty');
    if (specialtyError) newErrors.specialty = specialtyError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    // Apply sanitization
    let sanitizedValue = value;
    switch (field) {
      case 'fullName':
        sanitizedValue = sanitizers.name(value);
        break;
      case 'email':
        sanitizedValue = sanitizers.email(value);
        break;
      default:
        sanitizedValue = sanitizers.text(value);
    }
    
    // Update state
    switch (field) {
      case 'fullName':
        setFullName(sanitizedValue);
        break;
      case 'email':
        setEmail(sanitizedValue);
        break;
      case 'password':
        setPassword(sanitizedValue);
        break;
      case 'specialty':
        setSpecialty(sanitizedValue);
        break;
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    try {
      await authAPI.register({ 
        fullName: sanitizers.text(fullName), 
        email: sanitizers.email(email), 
        password, 
        specialty: sanitizers.text(specialty) 
      });
      // Do not auto-login after registration; redirect to login
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-teal-50 via-cyan-50 to-white">
      <Card className="w-full max-w-md border border-teal-100/60 shadow-xl backdrop-blur bg-white/80">
        <CardHeader>
          <CardTitle className="text-teal-900">Register</CardTitle>
          <CardDescription className="text-teal-700">Create a doctor account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input 
                id="fullName" 
                value={fullName} 
                onChange={(e) => handleInputChange('fullName', e.target.value)} 
                required 
                className={`focus-visible:ring-teal-600 ${errors.fullName ? 'border-red-500' : ''}`}
                placeholder="Enter your full name"
                maxLength={100}
              />
              {errors.fullName && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-500">{errors.fullName}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => handleInputChange('email', e.target.value)} 
                required 
                className={`focus-visible:ring-teal-600 ${errors.email ? 'border-red-500' : ''}`}
                placeholder="Enter your email address"
                autoComplete="email"
              />
              {errors.email && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-500">{errors.email}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => handleInputChange('password', e.target.value)} 
                required 
                className={`focus-visible:ring-teal-600 ${errors.password ? 'border-red-500' : ''}`}
                placeholder="Enter a strong password (8+ chars, uppercase, lowercase, number, special char)"
                autoComplete="new-password"
              />
              {errors.password && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-500">{errors.password}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty *</Label>
              <Input 
                id="specialty" 
                value={specialty} 
                onChange={(e) => handleInputChange('specialty', e.target.value)} 
                className={`focus-visible:ring-teal-600 ${errors.specialty ? 'border-red-500' : ''}`}
                placeholder="Enter your medical specialty"
                required
              />
              {errors.specialty && (
                <div className="flex items-center gap-1 mt-1">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-sm text-red-500">{errors.specialty}</p>
                </div>
              )}
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
            <Button type="submit" className="w-full gradient-button" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
          </form>
          <p className="text-sm text-teal-700 mt-4">
            Already have an account? <Link to="/login" className="text-teal-700 underline">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;


