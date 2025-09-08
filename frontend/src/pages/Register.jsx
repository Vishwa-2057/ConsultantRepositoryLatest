import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authAPI } from "@/services/api";
import { Link, useNavigate } from "react-router-dom";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("General Practitioner");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authAPI.register({ fullName: fullName.trim(), email: email.trim(), password, specialty });
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
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="focus-visible:ring-teal-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="focus-visible:ring-teal-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="focus-visible:ring-teal-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialty">Specialty</Label>
              <Input id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="focus-visible:ring-teal-600" />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700" disabled={loading}>{loading ? 'Creating...' : 'Create Account'}</Button>
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


