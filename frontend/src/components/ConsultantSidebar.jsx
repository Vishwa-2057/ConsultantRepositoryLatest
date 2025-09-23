import { Calendar, Users, UserCheck, Video, Share2, FileText, Mail, AlertTriangle, Home, LogOut, User, LayoutDashboard, Stethoscope, Heart, ArrowLeftRight, CreditCard, MessageCircle, UserPlus, Pill } from "lucide-react";
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
  { title: "Doctor Management", url: "/doctors", icon: UserCheck, routeName: "doctors-management" },
  { title: "Nurse Management", url: "/nurses", icon: UserPlus, routeName: "nurses-management" },
  { title: "Teleconsultation", url: "/teleconsultation", icon: Video, routeName: "teleconsultation" },
  { title: "Prescriptions", url: "/prescriptions", icon: Pill, routeName: "prescriptions" },
  { title: "Invoice Management", url: "/invoices", icon: FileText, routeName: "invoice-management" },
  { title: "Community Hub", url: "/community", icon: MessageCircle, routeName: "community-hub" },
  { title: "Referral System", url: "/referrals", icon: Share2, routeName: "referral-system" },
];

export function ConsultantSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
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
      ? "w-full justify-center transition-all duration-300 ease-in-out rounded-xl mx-1 px-2 py-3 font-medium relative overflow-hidden group"
      : "w-full justify-start transition-all duration-300 ease-in-out rounded-xl mx-2 px-4 py-3 font-medium relative overflow-hidden group";
    const activeClasses = isActive(path) 
      ? "bg-gradient-to-r from-blue-800 to-teal-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400/20 transform scale-[1.02] dark:from-blue-700 dark:to-teal-500 dark:shadow-blue-400/20" 
      : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-teal-50 hover:text-blue-800 hover:shadow-md hover:shadow-blue-200/50 border border-transparent hover:border-blue-200/50 hover:transform hover:scale-[1.01] dark:hover:from-blue-900/30 dark:hover:to-teal-900/30 dark:hover:text-blue-200 dark:hover:shadow-blue-700/30 dark:hover:border-blue-700/30";
    return `${baseClasses} ${activeClasses}`;
  };

  return (
    <Sidebar className={`border-r border-blue-200/50 bg-gradient-to-b from-white via-blue-50/20 to-teal-50/30 dark:border-blue-700/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900/80 transition-all duration-300 ease-in-out shadow-xl backdrop-blur-sm h-screen sticky top-0 flex-shrink-0`} style={{ minHeight: '100vh', width: collapsed ? '4rem' : '16rem' }}>
      <SidebarContent className="h-full flex flex-col overflow-hidden" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className="p-6 border-b border-blue-200/50 bg-gradient-to-r from-blue-50 via-teal-50/50 to-blue-100/30 dark:border-blue-700/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-800/80 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/20 to-teal-100/20 opacity-50 dark:from-blue-900/20 dark:to-teal-900/20"></div>
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-800 via-teal-500 to-blue-900 dark:from-blue-700 dark:via-teal-500 dark:to-blue-800 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-400/20 transform hover:scale-105 transition-transform duration-200">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-blue-900 dark:text-blue-100 text-lg tracking-tight">Smaart Healthcare</h2>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Healthcare Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1 px-3 py-6 min-h-0 overflow-y-auto">
          <SidebarGroupLabel className={`text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 px-2 ${collapsed ? "sr-only" : ""}`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex-1">
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Link to={item.url} className={getNavClassName(item.url)}>
                    <item.icon className={`w-5 h-5 transition-all duration-200 ${isActive(item.url) ? 'scale-110 text-white' : 'text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-200 group-hover:scale-105'}`} />
                    {!collapsed && (
                      <span className="ml-3 transition-all duration-200">
                        {item.title}
                      </span>
                    )}
                    {/* Active indicator */}
                    {isActive(item.url) && (
                      <div className="absolute right-2 w-2 h-2 bg-white dark:bg-teal-100 rounded-full shadow-sm"></div>
                    )}
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer - hide on auth pages, show logged-in user */}
        {!collapsed && !['/login','/register'].includes(currentPath) && authUser && (
          <div className={`p-6 border-t relative overflow-hidden mt-auto ${
            isClinic() 
              ? "border-purple-200/50 bg-gradient-to-r from-purple-50 via-indigo-50/30 to-purple-100/50 dark:border-purple-700/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-800/80"
              : "border-blue-200/50 bg-gradient-to-r from-blue-50 via-teal-50/30 to-blue-100/50 dark:border-blue-700/30 dark:from-slate-800/50 dark:via-slate-700/30 dark:to-slate-800/80"
          }`}>
            <div className={`absolute inset-0 opacity-50 ${
              isClinic()
                ? "bg-gradient-to-r from-purple-100/20 to-indigo-100/20 dark:from-purple-900/20 dark:to-indigo-900/20"
                : "bg-gradient-to-r from-blue-100/20 to-teal-100/20 dark:from-blue-900/20 dark:to-teal-900/20"
            }`}></div>
            <div className="relative text-sm">
              <p className={`font-semibold ${
                isClinic() 
                  ? "text-purple-900 dark:text-purple-100" 
                  : "text-blue-900 dark:text-blue-100"
              }`}>
                {authUser.name || authUser.fullName || 'User'}
              </p>
              <p className={`${
                isClinic() 
                  ? "text-purple-700 dark:text-purple-300" 
                  : "text-blue-700 dark:text-blue-300"
              }`}>
                {isClinic() ? 'Clinic Admin' : (authUser.specialty || 'Doctor')}
              </p>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
