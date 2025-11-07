import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar.jsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.jsx";
import { ConsultantSidebar } from "./ConsultantSidebar.jsx";
import { LogOut, Moon, Sun, User, PanelLeft, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet.jsx";
import { clinicAPI } from "@/services/api";

// Header component that can use useSidebar hook
function LayoutHeader({ getPageTitle, currentUser, currentTime, hideActions, toggleDarkMode, isDarkMode, mobileMenuOpen, setMobileMenuOpen, clinicName }) {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const handleLogoutClick = (e) => {
    e.preventDefault();
    
    // Just navigate to logout page - let Logout.jsx handle everything
    // This ensures the auth token is still available for the activity log API call
    navigate('/logout');
  };
  
  return (
    <header className="h-14 sm:h-16 bg-background border-b border-border flex items-center justify-between px-3 sm:px-6 flex-shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
        {/* Desktop sidebar toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:flex h-6 w-6 flex-shrink-0"
              onClick={toggleSidebar}
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle sidebar (Ctrl+B)</p>
          </TooltipContent>
        </Tooltip>

        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 flex-shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle mobile menu</span>
        </Button>

        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          {getPageTitle() && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">{getPageTitle()}</h1>
            </div>
          )}
          
          {/* Clinic name - shown on larger screens (only for non-clinic users) */}
          {clinicName && currentUser?.role !== 'clinic' && !currentUser?.isClinic && (
            <div className="hidden md:flex items-center gap-2 text-sm font-medium text-primary flex-shrink-0">
              <span className="truncate">{clinicName}</span>
            </div>
          )}
          
          {/* User info - hidden on mobile, shown on larger screens */}
          <div className="hidden xl:flex items-center gap-3 text-sm text-muted-foreground min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <User className="w-4 h-4" />
              <span className="truncate">{currentUser?.name || currentUser?.fullName || 'User'}</span>
            </div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0"></div>
            <div className="font-mono flex-shrink-0">
              {currentTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
            <div className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0"></div>
            <div className="flex-shrink-0">
              {currentTime.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Compact user info for medium screens */}
          <div className="hidden lg:flex xl:hidden items-center gap-2 text-sm text-muted-foreground min-w-0">
            <User className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{currentUser?.name || currentUser?.fullName || 'User'}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        {!hideActions && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate('/profile')}
                  className="h-8 w-8 sm:h-10 sm:w-10"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Profile</p>
              </TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode} className="h-8 w-8 sm:h-10 sm:w-10">
              {isDarkMode ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLogoutClick}
              className="hidden sm:flex group hover:bg-red-50 hover:border-red-300 hover:text-red-600 dark:hover:bg-red-950/20"
            >
              <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              <span className="hidden md:inline ml-2">
                Logout
              </span>
            </Button>
            {/* Mobile logout button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogoutClick}
              className="sm:hidden h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
            >
              <LogOut className="w-4 h-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

export function Layout({ children }) {
  const location = useLocation();
  const hideActions = ['/login','/register'].includes(location.pathname);
  const isAuthPage = hideActions;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clinicName, setClinicName] = useState('');
  
  // Get current user from localStorage
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('authUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  
  // Dark mode state
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('darkMode') === 'true';
    }
    return false;
  });

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDarkMode.toString());
  }, [isDarkMode]);

  // Listen for auth changes
  useEffect(() => {
    const handleAuthChanged = () => {
      try {
        const raw = localStorage.getItem('authUser');
        setCurrentUser(raw ? JSON.parse(raw) : null);
      } catch {
        setCurrentUser(null);
      }
    };

    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, []);

  // Fetch clinic name
  useEffect(() => {
    const fetchClinicName = async () => {
      if (!currentUser) {
        setClinicName('');
        return;
      }

      try {
        // If user is clinic admin, fetch their clinic profile
        if (currentUser?.role === 'clinic' || currentUser?.isClinic) {
          const response = await clinicAPI.getProfile();
          const clinic = response.data || response;
          if (clinic?.name) {
            setClinicName(clinic.name);
          }
        } else if (currentUser?.clinicId) {
          // For other users, fetch clinic profile
          const response = await clinicAPI.getProfile();
          const clinic = response.data || response;
          if (clinic?.name) {
            setClinicName(clinic.name);
          }
        }
      } catch (error) {
        console.error('Error fetching clinic name:', error);
        setClinicName('');
      }
    };

    fetchClinicName();
  }, [currentUser]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    const titleMap = {
      '/': '',
      '/dashboard': '',
      '/teleconsultation': '',
      '/patients': '',
      '/doctors': '',
      '/nurses': '',
      '/referrals': '',
      '/billing': '',
      '/community': '',
      '/email-settings': '',
      '/prescriptions': '',
      '/appointments': '',
      '/invoices': '',
      '/activity-logs': ''
    };
    return titleMap[path] || '';
  };

  // Get current time
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (isAuthPage) {
    return (
      <TooltipProvider>
        <div className="min-h-screen w-full bg-background">
          <main className="min-h-screen w-full">
            {children}
          </main>
        </div>
      </TooltipProvider>
    );
  }

  // If user is not authenticated, don't show the sidebar layout
  if (!currentUser) {
    return (
      <TooltipProvider>
        <div className="min-h-screen w-full bg-background">
          <main className="min-h-screen w-full">
            {children}
          </main>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider defaultOpen={true}>
        <div className="h-screen flex w-full bg-background overflow-hidden">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <ConsultantSidebar />
          </div>
          
          {/* Mobile Sidebar */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-64 lg:hidden">
              <ConsultantSidebar mobile={true} />
            </SheetContent>
          </Sheet>
          
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <LayoutHeader 
              getPageTitle={getPageTitle}
              currentUser={currentUser}
              currentTime={currentTime}
              hideActions={hideActions}
              toggleDarkMode={toggleDarkMode}
              isDarkMode={isDarkMode}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
              clinicName={clinicName}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto h-full">
              <div className="h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
