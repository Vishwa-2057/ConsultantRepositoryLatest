import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clinicAPI } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";
import { Shield, User, Mail, Lock, Phone, Building, Users } from "lucide-react";

const SuperAdminRegister = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    organization: "Smaart Healthcare",
    department: "Administration"
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: formData.phone.trim(),
        organization: formData.organization.trim(),
        department: formData.department.trim()
      };

      const res = await clinicAPI.register(registrationData);
      
      setSuccess("Clinic Admin account created successfully! Redirecting to login...");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-purple-50 via-indigo-50 to-white">
      <Card className="w-full max-w-lg border border-purple-100/60 shadow-xl backdrop-blur bg-white/80">
        <CardHeader>
          <CardTitle className="text-purple-900 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Clinic Admin Registration
          </CardTitle>
          <CardDescription className="text-purple-700">
            Create a new Clinic Admin account with full system privileges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Full Name
              </Label>
              <Input 
                id="fullName"
                name="fullName"
                type="text" 
                value={formData.fullName} 
                onChange={handleChange}
                required 
                className="focus-visible:ring-purple-600" 
                placeholder="Enter your full name"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Address
              </Label>
              <Input 
                id="email"
                name="email"
                type="email" 
                value={formData.email} 
                onChange={handleChange}
                required 
                className="focus-visible:ring-purple-600" 
                placeholder="Enter your email address"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Phone Number
              </Label>
              <Input 
                id="phone"
                name="phone"
                type="tel" 
                value={formData.phone} 
                onChange={handleChange}
                className="focus-visible:ring-purple-600" 
                placeholder="Enter your phone number"
              />
            </div>

            {/* Organization */}
            <div className="space-y-2">
              <Label htmlFor="organization" className="flex items-center gap-2">
                <Building className="w-4 h-4" />
                Organization
              </Label>
              <Input 
                id="organization"
                name="organization"
                type="text" 
                value={formData.organization} 
                onChange={handleChange}
                className="focus-visible:ring-purple-600" 
                placeholder="Organization name"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Department
              </Label>
              <Input 
                id="department"
                name="department"
                type="text" 
                value={formData.department} 
                onChange={handleChange}
                className="focus-visible:ring-purple-600" 
                placeholder="Department name"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Password
              </Label>
              <Input 
                id="password"
                name="password"
                type="password" 
                value={formData.password} 
                onChange={handleChange}
                required 
                className="focus-visible:ring-purple-600" 
                placeholder="Enter a strong password"
                minLength={8}
              />
              <p className="text-xs text-purple-600">
                Password must be at least 8 characters long
              </p>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirm Password
              </Label>
              <Input 
                id="confirmPassword"
                name="confirmPassword"
                type="password" 
                value={formData.confirmPassword} 
                onChange={handleChange}
                required 
                className="focus-visible:ring-purple-600" 
                placeholder="Confirm your password"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700" 
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Clinic Admin Account'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-purple-700">
              Already have an account?{' '}
              <Link to="/login" className="text-purple-700 underline hover:text-purple-900">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Security Notice */}
          <div className="mt-4 p-3 rounded-lg bg-purple-50 border border-purple-200">
            <p className="text-xs text-purple-700">
              <Shield className="w-3 h-3 inline mr-1" />
              Clinic Admin accounts have full system access. Only create accounts for trusted administrators.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminRegister;
