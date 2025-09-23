import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { ConsultantSidebar } from "./ConsultantSidebar.jsx";
import { TranslateDropdown } from "./TranslateDropdown.jsx";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

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

  // Quirky medical facts
  const medicalFacts = [
    "Your heart beats about 100,000 times per day",
    "Humans share 60% of their DNA with bananas",
    "Your brain uses 20% of your body's energy",
    "You blink about 17,000 times per day",
    "Your stomach gets a new lining every 3-4 days",
    "Bones are 5x stronger than steel by weight",
    "You lose about 8 pounds of dead skin per year",
    "Your liver can regenerate itself completely",
    "Humans are the only animals that blush",
    "Your lungs contain 300-500 million air sacs",
    "Fingernails grow 4x faster than toenails",
    "Your body produces 25 million new cells every second",
    "The human eye can distinguish 10 million colors",
    "Your brain has no pain receptors",
    "Stomach acid is strong enough to dissolve metal",
    "You're about 1cm taller in the morning than evening",
    "Your tongue print is as unique as your fingerprint",
    "Humans glow in the dark (but too faintly to see)",
    "Your foot is the same length as your forearm",
    "You produce about 1.5 liters of saliva daily"
  ];

  const [currentFactIndex, setCurrentFactIndex] = useState(0);

  useEffect(() => {
    const factTimer = setInterval(() => {
      setCurrentFactIndex(prev => (prev + 1) % medicalFacts.length);
    }, 10000); // Change fact every 10 seconds
    return () => clearInterval(factTimer);
  }, [medicalFacts.length]);
  if (isAuthPage) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-teal-50 via-cyan-50 to-white">
        <main className="min-h-screen flex items-center justify-center p-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        <ConsultantSidebar />
        
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Header */}
          <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-4 min-w-0">
              <SidebarTrigger className="lg:hidden flex-shrink-0" />
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
                  <div className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0"></div>
                  <div className="text-xs italic text-muted-foreground/70 max-w-xs truncate min-w-0">
                    Fun fact: {medicalFacts[currentFactIndex]}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!hideActions && (
                <>
                  <TranslateDropdown />
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

          {/* Main Content */}
          <main className="flex-1 overflow-auto h-full">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
