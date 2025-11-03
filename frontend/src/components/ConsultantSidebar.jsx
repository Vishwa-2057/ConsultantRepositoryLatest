import { Calendar, Users, UserCheck, Video, Share2, FileText, Mail, AlertTriangle, Home, LogOut, User, LayoutDashboard, Stethoscope, Heart, ArrowLeftRight, CreditCard, MessageCircle, UserPlus, Pill, Shield, Clock, TestTubeDiagonal } from "lucide-react";
import LogoImage from "@/assets/Images/Logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem, 
  useSidebar 
} from "@/components/ui/sidebar";
import { canAccessRoute, isClinic, isDoctor, getCurrentUser } from "@/utils/roleUtils";

const allNavigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, routeName: "dashboard" },
  { title: "Patient Management", url: "/patients", icon: Users, routeName: "patient-management" },
  { title: "Appointments", url: "/appointments", icon: Calendar, routeName: "appointment-management" },
  { title: "Slot Management", url: "/slot-management", icon: Clock, routeName: "slot-management" },
  { title: "Doctor Management", url: "/doctors", icon: UserCheck, routeName: "doctors-management" },
  { title: "Nurse Management", url: "/nurses", icon: UserPlus, routeName: "nurses-management" },
  { title: "Prescriptions", url: "/prescriptions", icon: Pill, routeName: "prescriptions" },
  { title: "Lab Reports", url: "/lab-reports", icon: TestTubeDiagonal, routeName: "lab-reports" },
  { title: "Teleconsultation", url: "/teleconsultation", icon: Video, routeName: "teleconsultation" },
  { title: "Referral System", url: "/referrals", icon: Share2, routeName: "referral-system" },
  { title: "Invoice Management", url: "/invoices", icon: FileText, routeName: "invoice-management" },
  { title: "Community Hub", url: "/community", icon: MessageCircle, routeName: "community-hub" },
];

export function ConsultantSidebar({ mobile = false }) {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = !mobile && state === "collapsed";
  const authUser = getCurrentUser();
  
  // Filter navigation items based on user role
  const navigationItems = allNavigationItems.filter(item => 
    canAccessRoute(item.routeName)
  );

  const isActive = (path) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path) => {
    const baseClasses = collapsed 
      ? "w-full justify-center transition-all duration-200 ease-in-out rounded-lg mx-1 px-2 py-2.5 font-medium relative group"
      : mobile
      ? "w-full justify-start transition-all duration-200 ease-in-out rounded-lg mx-2 px-3 py-3 font-medium relative group whitespace-nowrap text-base"
      : "w-full justify-start transition-all duration-200 ease-in-out rounded-lg mx-2 px-3 py-2.5 font-medium relative group whitespace-nowrap";
    const activeClasses = isActive(path) 
      ? "bg-primary text-primary-foreground shadow-sm border border-primary/20" 
      : "hover:bg-accent hover:text-accent-foreground border border-transparent hover:border-border";
    return `${baseClasses} ${activeClasses}`;
  };

  return (
    <Sidebar className={`${mobile ? 'border-0' : 'border-r border-border'} bg-background dark:bg-background transition-all duration-300 ease-in-out shadow-sm h-screen ${mobile ? 'w-full' : 'sticky top-0 flex-shrink-0'} ${collapsed ? 'w-16' : 'w-64'}`} style={mobile ? { minHeight: '100vh', width: '100%' } : { minHeight: '100vh', width: collapsed ? '4rem' : '16rem', minWidth: collapsed ? '4rem' : '16rem', maxWidth: collapsed ? '4rem' : '16rem' }}>
      <SidebarContent className="h-full flex flex-col overflow-x-hidden overflow-y-hidden" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className={`${mobile ? 'h-20' : 'h-16'} border-b border-border bg-background dark:bg-background flex items-center ${collapsed ? 'px-2 justify-center' : mobile ? 'px-6 py-6' : 'px-6 py-4'} flex-shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`${mobile ? 'w-12 h-12' : 'w-10 h-10'} rounded-lg flex items-center justify-center shadow-sm border border-border overflow-hidden bg-card`}>
              <img 
                src={LogoImage} 
                alt="Smaart Healthcare Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <h2 className={`font-semibold text-foreground ${mobile ? 'text-xl' : 'text-lg'} tracking-tight whitespace-nowrap`}>SMAART Healthcare</h2>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className={`flex-1 px-3 ${mobile ? 'py-8' : 'py-6'} min-h-0 overflow-x-hidden overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent`}>
          <SidebarGroupLabel className={`text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4 px-2 ${collapsed ? "sr-only" : ""}`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex-1">
            <SidebarMenu className={`${mobile ? 'space-y-2' : 'space-y-1'}`} key={collapsed ? 'collapsed' : mobile ? 'mobile' : 'expanded'}>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Link to={item.url} className={`${getNavClassName(item.url)} flex items-center`}>
                    <item.icon className={`${mobile ? 'w-6 h-6' : 'w-5 h-5'} flex-shrink-0 transition-all duration-200 ${isActive(item.url) ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'}`} />
                    {!collapsed && (
                      <span className={`${mobile ? 'ml-3' : 'ml-2'} transition-all duration-200 overflow-hidden whitespace-nowrap text-ellipsis`}>
                        {item.title}
                      </span>
                    )}
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer - hide on auth pages, show logged-in user */}
        {!collapsed && !['/login','/register'].includes(currentPath) && authUser && (
          <div className={`${mobile ? 'p-6' : 'p-4'} border-t border-border bg-muted/30 mt-auto`}>
            <div className={`${mobile ? 'text-base' : 'text-md'} overflow-hidden`}>
              <p className="font-medium text-foreground whitespace-nowrap text-ellipsis overflow-hidden" style={{color: "#0059b3"}}>
                {authUser.name || authUser.fullName || 'User'}
              </p>
              <p className={`text-muted-foreground ${mobile ? 'text-sm' : 'text-xs'} whitespace-nowrap text-ellipsis overflow-hidden`}>
                {isClinic() ? 'Clinic Administrator' : (authUser.specialty || 'Medical Professional')}
              </p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
