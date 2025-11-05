import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  User, Mail, Phone, MapPin, Building2, Calendar, Edit, Save, X,
  Briefcase, GraduationCap, Languages, Clock, Activity
} from 'lucide-react';
import { getCurrentUser } from '@/utils/roleUtils';
import { clinicAPI, doctorAPI, nurseAPI, pharmacistAPI } from '@/services/api';
import { toast } from 'sonner';

const Profile = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [saving, setSaving] = useState(false);

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

      // Fetch data from backend based on user role
      if (user.role === 'clinic' || user.isClinic) {
        const response = await clinicAPI.getProfile();
        data = response.data || response;
      } else if (user.role === 'doctor') {
        const response = await doctorAPI.getById(user._id || user.id);
        data = response.data || response;
      } else if (user.role === 'nurse' || user.role === 'head_nurse' || user.role === 'supervisor') {
        const response = await nurseAPI.getById(user._id || user.id);
        data = response.data || response;
      } else if (user.role === 'pharmacist' || user.role === 'head_pharmacist' || user.role === 'pharmacy_manager') {
        const response = await pharmacistAPI.getById(user._id || user.id);
        data = response.data || response;
      } else {
        throw new Error('Unknown user role');
      }

      setProfileData(data);
      setEditedData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error(`Failed to load profile data: ${error.message}`);
      // Don't fallback to localStorage - show error state
      setProfileData(null);
      setEditedData({});
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      if (currentUser.role === 'clinic' || currentUser.isClinic) {
        await clinicAPI.updateProfile(editedData);
      } else if (currentUser.role === 'doctor') {
        await doctorAPI.update(currentUser._id || currentUser.id, editedData);
      } else if (currentUser.role === 'nurse' || currentUser.role === 'head_nurse' || currentUser.role === 'supervisor') {
        await nurseAPI.update(currentUser._id || currentUser.id, editedData);
      } else if (currentUser.role === 'pharmacist' || currentUser.role === 'head_pharmacist' || currentUser.role === 'pharmacy_manager') {
        await pharmacistAPI.update(currentUser._id || currentUser.id, editedData);
      }

      toast.success('Profile updated successfully');
      setProfileData(editedData);
      setIsEditing(false);
      
      // Update localStorage with fresh data
      const updatedUser = { ...currentUser, ...editedData };
      localStorage.setItem('authUser', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('auth-changed'));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setEditedData(prev => ({ ...prev, [field]: value }));
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      clinic: 'bg-purple-500', 
      doctor: 'bg-blue-500', 
      nurse: 'bg-green-500',
      head_nurse: 'bg-emerald-500', 
      supervisor: 'bg-teal-500',
      pharmacist: 'bg-orange-500',
      head_pharmacist: 'bg-amber-500',
      pharmacy_manager: 'bg-yellow-600'
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role) => {
    const labels = {
      clinic: 'Clinic Admin', 
      doctor: 'Doctor', 
      nurse: 'Nurse',
      head_nurse: 'Head Nurse', 
      supervisor: 'Supervisor',
      pharmacist: 'Pharmacist',
      head_pharmacist: 'Head Pharmacist',
      pharmacy_manager: 'Pharmacy Manager'
    };
    return labels[role] || role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-96">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No profile data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1">Manage your account information</p>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
            ) : (
              <>
                <Button onClick={() => { setIsEditing(false); setEditedData(profileData); }} variant="outline" className="gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-32 h-32 mb-4">
                  <AvatarImage src={profileData.profileImage} alt={profileData.fullName || profileData.name} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(profileData.fullName || profileData.name)}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-2xl font-bold mb-2">
                  {profileData.fullName || profileData.name || profileData.adminName}
                </h2>
                
                <Badge className={`${getRoleBadgeColor(currentUser.role)} text-white mb-4`}>
                  {getRoleLabel(currentUser.role)}
                </Badge>

                {profileData.uhid && (
                  <div className="text-sm text-muted-foreground mb-2">
                    UHID: <span className="font-mono font-semibold">{profileData.uhid}</span>
                  </div>
                )}

                <Separator className="my-4 w-full" />

                <div className="w-full space-y-3 text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground break-all">
                      {profileData.email || profileData.adminEmail}
                    </span>
                  </div>
                  
                  {profileData.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{profileData.phone}</span>
                    </div>
                  )}

                  {profileData.isActive !== undefined && (
                    <div className="flex items-center gap-2 text-sm">
                      <Activity className="w-4 h-4 text-muted-foreground" />
                      <span className={profileData.isActive ? 'text-green-600' : 'text-red-600'}>
                        {profileData.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}

                  {profileData.createdAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Joined {new Date(profileData.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="professional">Professional</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your basic personal details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(currentUser.role === 'clinic' || currentUser.isClinic) && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Clinic Name</Label>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {isEditing ? (
                              <Input value={editedData.name || ''} onChange={(e) => handleInputChange('name', e.target.value)} />
                            ) : (
                              <span>{profileData.name}</span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Type </Label>
                          {isEditing ? (
                            <Input value={editedData.type || ''} onChange={(e) => handleInputChange('type', e.target.value)} />
                          ) : (
                            <span>{profileData.type}</span>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Registration Number </Label>
                          <span className="font-mono">{profileData.registrationNumber}</span>
                        </div>

                        <div className="space-y-2">
                          <Label>Year Established </Label>
                          <span>{profileData.yearOfEstablishment}</span>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label>Address</Label>
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                          <div className="flex-1">
                            <p>{profileData.address}</p>
                            <p>{profileData.city}, {profileData.state} {profileData.zipCode}</p>
                            <p>{profileData.country}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{profileData.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Email</Label>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="break-all">{profileData.email}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {currentUser.role === 'doctor' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Full Name</Label>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>{profileData.fullName}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Email</Label>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <span className="break-all">{profileData.email}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span>{profileData.phone}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>UHID</Label>
                          <span className="font-mono">{profileData.uhid}</span>
                        </div>
                      </div>

                      {profileData.currentAddress && (
                        <>
                          <Separator />
                          <div className="space-y-2">
                            <Label>Current Address</Label>
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                              <div className="flex-1">
                                <p>{profileData.currentAddress.street}</p>
                                <p>{profileData.currentAddress.city}, {profileData.currentAddress.state} {profileData.currentAddress.zipCode}</p>
                                <p>{profileData.currentAddress.country}</p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {(currentUser.role === 'nurse' || currentUser.role === 'head_nurse' || currentUser.role === 'supervisor') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{profileData.fullName}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="break-all">{profileData.email}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{profileData.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>UHID</Label>
                        <span className="font-mono">{profileData.uhid}</span>
                      </div>
                    </div>
                  )}

                  {(currentUser.role === 'pharmacist' || currentUser.role === 'head_pharmacist' || currentUser.role === 'pharmacy_manager') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span>{profileData.fullName}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Email</Label>
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="break-all">{profileData.email}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Phone</Label>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{profileData.phone}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>UHID</Label>
                        <span className="font-mono">{profileData.uhid}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                  <CardDescription>Your professional details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(currentUser.role === 'clinic' || currentUser.isClinic) && (
                    <>
                      {profileData.specialties && profileData.specialties.length > 0 && (
                        <div className="space-y-2">
                          <Label>Specialties</Label>
                          <div className="flex flex-wrap gap-2">
                            {profileData.specialties.map((specialty, index) => (
                              <Badge key={index} variant="secondary">{specialty}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {profileData.services && profileData.services.length > 0 && (
                        <div className="space-y-2">
                          <Label>Services</Label>
                          <div className="flex flex-wrap gap-2">
                            {profileData.services.map((service, index) => (
                              <Badge key={index} variant="outline">{service}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileData.staffCount && (
                          <div className="space-y-2">
                            <Label>Staff Count</Label>
                            <span>{profileData.staffCount}</span>
                          </div>
                        )}

                        {profileData.beds && (
                          <div className="space-y-2">
                            <Label>Beds</Label>
                            <span>{profileData.beds}</span>
                          </div>
                        )}
                      </div>

                      {profileData.operatingHours && (
                        <div className="space-y-2">
                          <Label>Operating Hours</Label>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span>{profileData.operatingHours}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {currentUser.role === 'doctor' && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Specialty</Label>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                            <span>{profileData.specialty}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Qualification</Label>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            <span>{profileData.qualification}</span>
                          </div>
                        </div>
                      </div>

                      {profileData.languages && profileData.languages.length > 0 && (
                        <div className="space-y-2">
                          <Label>Languages</Label>
                          <div className="flex items-center gap-2">
                            <Languages className="w-4 h-4 text-muted-foreground" />
                            <div className="flex flex-wrap gap-2">
                              {profileData.languages.map((lang, index) => (
                                <Badge key={index} variant="secondary">{lang}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {profileData.about && (
                        <div className="space-y-2">
                          <Label>About</Label>
                          <p className="text-sm text-muted-foreground">{profileData.about}</p>
                        </div>
                      )}
                    </>
                  )}

                  {(currentUser.role === 'nurse' || currentUser.role === 'head_nurse' || currentUser.role === 'supervisor') && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileData.department && (
                          <div className="space-y-2">
                            <Label>Department</Label>
                            <div className="flex flex-wrap gap-2">
                              {Array.isArray(profileData.department) ? (
                                profileData.department.map((dept, index) => (
                                  <Badge key={index} variant="secondary">{dept}</Badge>
                                ))
                              ) : (
                                <Badge variant="secondary">{profileData.department}</Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {profileData.shift && (
                          <div className="space-y-2">
                            <Label>Shift</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{profileData.shift}</span>
                            </div>
                          </div>
                        )}

                        {profileData.experience !== undefined && (
                          <div className="space-y-2">
                            <Label>Experience</Label>
                            <span>{profileData.experience} years</span>
                          </div>
                        )}

                        {profileData.licenseNumber && (
                          <div className="space-y-2">
                            <Label>License Number</Label>
                            <span className="font-mono">{profileData.licenseNumber}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {(currentUser.role === 'pharmacist' || currentUser.role === 'head_pharmacist' || currentUser.role === 'pharmacy_manager') && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profileData.specialization && (
                          <div className="space-y-2">
                            <Label>Specialization</Label>
                            <div className="flex items-center gap-2">
                              <Briefcase className="w-4 h-4 text-muted-foreground" />
                              <span>{profileData.specialization}</span>
                            </div>
                          </div>
                        )}

                        {profileData.licenseNumber && (
                          <div className="space-y-2">
                            <Label>License Number</Label>
                            <span className="font-mono">{profileData.licenseNumber}</span>
                          </div>
                        )}

                        {profileData.shift && (
                          <div className="space-y-2">
                            <Label>Shift</Label>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span>{profileData.shift}</span>
                            </div>
                          </div>
                        )}

                        {profileData.experience !== undefined && (
                          <div className="space-y-2">
                            <Label>Experience</Label>
                            <span>{profileData.experience} years</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Profile;
