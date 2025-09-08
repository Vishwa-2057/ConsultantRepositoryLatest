import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile.jsx"
import { cn } from "@/lib/utils.js"
import { Button } from "@/components/ui/button.jsx"
import { Input } from "@/components/ui/input.jsx"
import { Separator } from "@/components/ui/separator.jsx"
import { Sheet, SheetContent } from "@/components/ui/sheet.jsx"
import { Skeleton } from "@/components/ui/skeleton.jsx"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip.jsx"

const SIDEBAR_COOKIE_NAME = "sidebar:state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

const SidebarContext = React.createContext(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)

    // This is the internal state of the sidebar.
    // We use openProp and setOpenProp for control from outside the component.
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback(
      (value) => {
        const openState = typeof value === "function" ? value(open) : value
        if (setOpenProp) {
          setOpenProp(openState)
        } else {
          _setOpen(openState)
        }

        // This sets the cookie to keep the sidebar state.
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      },
      [setOpenProp, open]
    )

    // Helper to toggle the sidebar.
    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((open) => !open)
        : setOpen((open) => !open)
    }, [isMobile, setOpen, setOpenMobile])

    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
      const handleKeyDown = (event) => {
        if (
          (event.metaKey || event.ctrlKey) &&
          event.key === SIDEBAR_KEYBOARD_SHORTCUT
        ) {
          event.preventDefault()
          toggleSidebar()
        }
      }

      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }, [toggleSidebar])

    // This effect sets the initial state of the sidebar from the cookie.
    React.useEffect(() => {
      const cookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith(SIDEBAR_COOKIE_NAME))
      if (cookie) {
        const value = cookie.split("=")[1]
        if (value === "true" || value === "false") {
          setOpen(value === "true")
        }
      }
    }, [setOpen])

    const value = React.useMemo(
      () => ({
        state: open ? "expanded" : "collapsed",
        open,
        setOpen,
        openMobile,
        setOpenMobile,
        isMobile,
        toggleSidebar,
      }),
      [open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar]
    )

    return (
      <SidebarContext.Provider value={value}>
        <div
          ref={ref}
          className={cn("relative", className)}
          style={style}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <aside
      ref={ref}
      className={cn("group/sidebar relative flex h-full w-full flex-col", className)}
      {...props}
    >
      {children}
    </aside>
  )
)
Sidebar.displayName = "Sidebar"

const SidebarContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-full w-full flex-col", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-4 p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("text-xs font-semibold text-muted-foreground", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupContent = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarMenuItem.displayName = "SidebarMenuItem"

const SidebarMenuButton = React.forwardRef(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex w-full items-center gap-2 text-sm font-medium transition-all duration-300 ease-in-out group", className)}
      {...props}
    >
      {children}
    </div>
  )
)
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarTrigger = React.forwardRef(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        className={cn("h-6 w-6", className)}
        onClick={toggleSidebar}
        {...props}
      >
        <PanelLeft className="h-4 w-4" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>
    )
  }
)
SidebarTrigger.displayName = "SidebarTrigger"

export {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
}
