import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar.jsx";
import { ConsultantSidebar } from "./ConsultantSidebar.jsx";
import { Bell, Search, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Link, useLocation } from "react-router-dom";

export function Layout({ children }) {
  const location = useLocation();
  const hideActions = ['/login','/register'].includes(location.pathname);
  const isAuthPage = hideActions;
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
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header */}
          <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="lg:hidden" />
              <div className="hidden md:flex items-center gap-2 max-w-md flex-1">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search patients, appointments..." 
                  className="border-0 bg-muted/50 focus-visible:ring-1"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {!hideActions && (
                <>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full flex items-center justify-center">
                      <span className="text-xs text-destructive-foreground">3</span>
                    </div>
                  </Button>
                  <Button variant="ghost" size="icon">
                    <Settings className="w-5 h-5" />
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
