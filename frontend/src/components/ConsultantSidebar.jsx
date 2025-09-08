import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Video,
  ArrowLeftRight,
  CreditCard,
  MessageCircle,
  Stethoscope,
  Menu,
  X
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Patient Management", url: "/patients", icon: Users },
  { title: "Teleconsultation", url: "/teleconsultation", icon: Video },
  { title: "Referral System", url: "/referrals", icon: ArrowLeftRight },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Community Hub", url: "/community", icon: MessageCircle },
];

export function ConsultantSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  const collapsed = state === "collapsed";
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('authUser');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const isActive = (path) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  const getNavClassName = (path) => {
    const baseClasses = "w-full justify-start transition-all duration-300 ease-in-out rounded-xl mx-2 px-4 py-3 font-medium relative overflow-hidden group";
    const activeClasses = isActive(path) 
      ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25 border border-teal-400/20 transform scale-[1.02]" 
      : "hover:bg-gradient-to-r hover:from-teal-50 hover:to-cyan-50 hover:text-teal-800 hover:shadow-md hover:shadow-teal-200/50 border border-transparent hover:border-teal-200/50 hover:transform hover:scale-[1.01]";
    return `${baseClasses} ${activeClasses}`;
  };

  return (
    <Sidebar className={`border-r border-teal-200/50 bg-gradient-to-b from-white via-teal-50/20 to-cyan-50/30 ${collapsed ? "w-16" : "w-64"} transition-all duration-300 ease-in-out shadow-xl backdrop-blur-sm h-screen sticky top-0`} style={{ minHeight: '100vh' }}>
      <SidebarContent className="h-full flex flex-col" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div className="p-6 border-b border-teal-200/50 bg-gradient-to-r from-teal-50 via-cyan-50/50 to-teal-100/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-100/20 to-cyan-100/20 opacity-50"></div>
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25 transform hover:scale-105 transition-transform duration-200">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <h2 className="font-bold text-teal-900 text-lg tracking-tight">Smaart Healthcare</h2>
                <p className="text-sm text-teal-700 font-medium">Healthcare Platform</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <SidebarGroup className="flex-1 px-3 py-6 min-h-0">
          <SidebarGroupLabel className={`text-xs font-semibold text-teal-600 uppercase tracking-wider mb-4 px-2 ${collapsed ? "sr-only" : ""}`}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex-1">
            <SidebarMenu className="space-y-2">
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavClassName(item.url)}>
                      <item.icon className={`w-5 h-5 transition-all duration-200 ${isActive(item.url) ? 'scale-110 text-white' : 'text-teal-600 group-hover:text-teal-800 group-hover:scale-105'}`} />
                      {!collapsed && (
                        <span className="ml-3 transition-all duration-200">
                          {item.title}
                        </span>
                      )}
                      {/* Active indicator */}
                      {isActive(item.url) && (
                        <div className="absolute right-2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer - hide on auth pages, show logged-in doctor */}
        {!collapsed && !['/login','/register'].includes(currentPath) && authUser && (
          <div className="p-6 border-t border-teal-200/50 bg-gradient-to-r from-teal-50 via-cyan-50/30 to-teal-100/50 relative overflow-hidden mt-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-100/20 to-cyan-100/20 opacity-50"></div>
            <div className="relative text-sm">
              <p className="font-semibold text-teal-900">{authUser.fullName}</p>
              <p className="text-teal-700">{authUser.specialty || 'Doctor'}</p>
              <div className="mt-3 w-12 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 rounded-full shadow-sm"></div>
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
