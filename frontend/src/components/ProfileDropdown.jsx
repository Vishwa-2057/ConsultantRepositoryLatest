import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, Building2, Briefcase, Loader2 } from "lucide-react";
import { getCurrentUser, isClinic, isDoctor, isPharmacist } from '@/utils/roleUtils';
import { clinicAPI, doctorAPI, nurseAPI, pharmacistAPI } from '@/services/api';

export function ProfileDropdown() {
  const [currentUser, setCurrentUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [ownerName, setOwnerName] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Fetch profile data when dropdown opens
  useEffect(() => {
    if (open && currentUser && !profileData) {
      fetchProfileData();
    }
  }, [open, currentUser]);

  const fetchProfileData = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      let data;

      if (currentUser.role === 'clinic' || currentUser.isClinic) {
        const response = await clinicAPI.getProfile();
        data = response.data || response;
        // Extract owner name for clinic users
        if (data?.ownerName) {
          setOwnerName(data.ownerName);
        }
      } else if (currentUser.role === 'doctor') {
        const response = await doctorAPI.getById(currentUser._id || currentUser.id);
        data = response.data || response;
      } else if (['nurse', 'head_nurse', 'supervisor'].includes(currentUser.role)) {
        const response = await nurseAPI.getById(currentUser._id || currentUser.id);
        data = response.data || response;
      } else if (['pharmacist', 'head_pharmacist', 'pharmacy_manager'].includes(currentUser.role)) {
        const response = await pharmacistAPI.getById(currentUser._id || currentUser.id);
        data = response.data || response;
      }

      setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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

  if (!currentUser) return null;

  // Use owner name for clinic users, otherwise use current user name
  const displayName = (isClinic() && ownerName) ? ownerName : (currentUser.name || currentUser.fullName || 'User');
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 sm:h-10 sm:w-10 relative"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {initials}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="pb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-lg shadow-md">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base truncate">{displayName}</p>
              <Badge className={`mt-1 text-xs ${getRoleBadgeColor(currentUser.role)}`}>
                {getRoleLabel(currentUser.role)}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : profileData ? (
          <div className="px-2 py-3 space-y-3">
            {/* Email */}
            {(profileData.email || profileData.adminEmail) && (
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium truncate">{profileData.email || profileData.adminEmail}</p>
                </div>
              </div>
            )}

            {/* Phone */}
            {profileData.phone && (
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{profileData.phone}</p>
                </div>
              </div>
            )}

            {/* Specialty (for doctors) */}
            {profileData.specialty && (
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Specialty</p>
                  <p className="text-sm font-medium">{profileData.specialty}</p>
                </div>
              </div>
            )}

            {/* License Number (for doctors/nurses/pharmacists) */}
            {profileData.licenseNumber && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">License Number</p>
                  <p className="text-sm font-medium">{profileData.licenseNumber}</p>
                </div>
              </div>
            )}

            {/* Address (for clinics) */}
            {profileData.address && (
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm font-medium line-clamp-2">{profileData.address}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            Unable to load profile details
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
