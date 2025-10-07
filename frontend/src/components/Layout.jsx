import { SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar.jsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.jsx";
import { ConsultantSidebar } from "./ConsultantSidebar.jsx";
import { LogOut, Moon, Sun, User, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

// Header component that can use useSidebar hook
function LayoutHeader({ getPageTitle, currentUser, currentTime, hideActions, toggleDarkMode, isDarkMode }) {
  const { toggleSidebar } = useSidebar();
  
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
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
        <div className="flex items-center gap-4 min-w-0">
          {getPageTitle() && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <h1 className="text-xl font-semibold text-foreground">{getPageTitle()}</h1>
            </div>
          )}
          <div className="hidden lg:flex items-center gap-3 text-sm text-muted-foreground min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <User className="w-4 h-4" />
              <span>{currentUser?.name || currentUser?.fullName || 'User'}</span>
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
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {!hideActions && (
          <>
            <Button variant="ghost" size="icon" onClick={toggleDarkMode}>
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/logout" className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Logout
              </Link>
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

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    const titleMap = {
      '/': '',
      '/dashboard': '',
      '/teleconsultation': 'Teleconsultation',
      '/patients': 'Patient Management',
      '/doctors': 'Doctors Management',
      '/nurses': 'Nurses Management',
      '/referrals': 'Referral System',
      '/billing': 'Billing & Invoices',
      '/community': 'Community Hub',
      '/email-settings': 'Email Settings'
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
          <main className="min-h-screen flex items-center justify-center p-6">
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
          <main className="min-h-screen flex items-center justify-center p-6">
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
          <ConsultantSidebar />
          
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            <LayoutHeader 
              getPageTitle={getPageTitle}
              currentUser={currentUser}
              currentTime={currentTime}
              hideActions={hideActions}
              toggleDarkMode={toggleDarkMode}
              isDarkMode={isDarkMode}
            />

            {/* Main Content */}
            <main className="flex-1 overflow-auto h-full">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}
