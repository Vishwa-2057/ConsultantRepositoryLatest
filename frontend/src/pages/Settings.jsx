import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, Mail, Phone, Save, Loader2, Settings as SettingsIcon, CheckCircle2, AlertCircle
} from 'lucide-react';
import { getCurrentUser } from '@/utils/roleUtils';
import { clinicAPI, doctorAPI, nurseAPI, pharmacistAPI } from '@/services/api';
import { toast } from 'sonner';

const Settings = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedData, setEditedData] = useState({
    name: '',
    fullName: '',
    email: '',
    adminEmail: '',
    phone: ''
  });

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    fetchProfileData(user);
  }, []);

  const fetchProfileData = async (user) => {
    if (!user) return;
    
    try {
      setLoading(true);
      let data;

      if (user.role === 'clinic' || user.isClinic) {
        const response = await clinicAPI.getProfile();
        data = response.data || response;
      } else if (user.role === 'doctor') {
        const response = await doctorAPI.getById(user._id || user.id);
        data = response.data || response;
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(user.role)) {
        const response = await nurseAPI.getById(user._id || user.id);
        data = response.data || response;
      } else if (['pharmacist', 'head_pharmacist', 'pharmacy_manager'].includes(user.role)) {
        const response = await pharmacistAPI.getById(user._id || user.id);
        data = response.data || response;
      }

      setProfileData(data);
      setEditedData({
        name: data?.name || '',
        fullName: data?.fullName || '',
        email: data?.email || '',
        adminEmail: data?.adminEmail || '',
        phone: data?.phone || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updatePayload = {
        phone: editedData.phone
      };

      if (currentUser.role === 'clinic' || currentUser.isClinic) {
        updatePayload.name = editedData.name;
        if (editedData.adminEmail && editedData.adminEmail !== profileData.adminEmail) {
          updatePayload.adminEmail = editedData.adminEmail;
        }
      } else {
        updatePayload.fullName = editedData.fullName;
        if (editedData.email && editedData.email !== profileData.email) {
          updatePayload.email = editedData.email;
        }
      }

      let response;
      if (currentUser.role === 'clinic' || currentUser.isClinic) {
        response = await clinicAPI.updateProfile(updatePayload);
      } else if (currentUser.role === 'doctor') {
        response = await doctorAPI.update(currentUser._id || currentUser.id, updatePayload);
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(currentUser.role)) {
        response = await nurseAPI.update(currentUser._id || currentUser.id, updatePayload);
      } else if (['pharmacist', 'head_pharmacist', 'pharmacy_manager'].includes(currentUser.role)) {
        response = await pharmacistAPI.update(currentUser._id || currentUser.id, updatePayload);
      }

      const updatedData = response.data || response;
      setProfileData(updatedData);
      
      // Update localStorage
      const storedUser = JSON.parse(localStorage.getItem('authUser') || '{}');
      if (currentUser.role === 'clinic' || currentUser.isClinic) {
        storedUser.name = updatedData.name;
      } else {
        storedUser.fullName = updatedData.fullName;
        storedUser.name = updatedData.fullName;
      }
      localStorage.setItem('authUser', JSON.stringify(storedUser));
      window.dispatchEvent(new Event('auth-changed'));

      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const roleColors = {
      'clinic': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'doctor': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'nurse': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'head_nurse': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'supervisor': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'pharmacist': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'head_pharmacist': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'pharmacy_manager': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const getRoleLabel = (role) => {
    const roleLabels = {
      'clinic': 'Clinic Administrator',
      'doctor': 'Doctor',
      'nurse': 'Nurse',
      'head_nurse': 'Head Nurse',
      'supervisor': 'Supervisor',
      'pharmacist': 'Pharmacist',
      'head_pharmacist': 'Head Pharmacist',
      'pharmacy_manager': 'Pharmacy Manager',
    };
    return roleLabels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  const displayName = currentUser?.name || currentUser?.fullName || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <SettingsIcon className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Account Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your personal information and preferences
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="shadow-md border-gray-200 dark:border-gray-800">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                {initials}
              </div>
              <div>
                <CardTitle className="text-xl">{displayName}</CardTitle>
                <Badge className={`mt-2 ${getRoleBadgeColor(currentUser?.role)}`}>
                  {getRoleLabel(currentUser?.role)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  {currentUser?.role === 'clinic' || currentUser?.isClinic ? 'Clinic Name' : 'Full Name'}
                </Label>
                <Input
                  id="name"
                  value={currentUser?.role === 'clinic' || currentUser?.isClinic ? editedData.name : editedData.fullName}
                  onChange={(e) => setEditedData(prev => ({
                    ...prev,
                    [currentUser?.role === 'clinic' || currentUser?.isClinic ? 'name' : 'fullName']: e.target.value
                  }))}
                  placeholder="Enter your name"
                  className="h-11"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={currentUser?.role === 'clinic' || currentUser?.isClinic ? editedData.adminEmail : editedData.email}
                  onChange={(e) => setEditedData(prev => ({
                    ...prev,
                    [currentUser?.role === 'clinic' || currentUser?.isClinic ? 'adminEmail' : 'email']: e.target.value
                  }))}
                  placeholder="Enter your email"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Changing your email may require re-verification
                </p>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={editedData.phone}
                  onChange={(e) => setEditedData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  className="h-11"
                />
              </div>

              <Separator />

              {/* Save Button */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Changes will be saved to your account
                </p>
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Your information is secure
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  All changes are encrypted and stored securely. Your personal information is never shared with third parties without your consent.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
