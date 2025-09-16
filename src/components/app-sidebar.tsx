import {
  LayoutDashboard,
  Users,
  UserCheck,
  CreditCard,
  TrendingUp,
  Settings,
  LogOut,
  Dumbbell,
  Package,
  Shield,
  Activity,
  Calendar,
  MessageSquare,
  RotateCcw,
  ClipboardCheck,
  DollarSign,
} from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function AppSidebar() {
  const { user, role, signOut, profile } = useAuth()
  const location = useLocation()

  const ownerNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/staff', label: 'Staff', icon: UserCheck },
    { href: '/trainers', label: 'Trainers', icon: Dumbbell },
    { href: '/inquiries', label: 'Inquiries', icon: MessageSquare },
    { href: '/packages', label: 'Packages', icon: Package },
    // { href: '/payments', label: 'Payments', icon: CreditCard },
    // { href: '/refunds', label: 'Refunds', icon: RotateCcw },
    { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
    { href: '/finance', label: 'Finance', icon: DollarSign },
    { href: '/reports', label: 'Reports', icon: TrendingUp },
    // { href: '/settings', label: 'Settings', icon: Settings },
    { href: '/permissions', label: 'Permissions', icon: Shield },
  ]

  const managerNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/staff', label: 'Staff', icon: UserCheck },
    { href: '/trainers', label: 'Trainers', icon: Dumbbell },
    { href: '/inquiries', label: 'Inquiries', icon: MessageSquare },
    { href: '/packages', label: 'Packages', icon: Package },
    { href: '/payments', label: 'Payments', icon: CreditCard },
    { href: '/refunds', label: 'Refunds', icon: RotateCcw },
    { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
    { href: '/finance', label: 'Finance', icon: DollarSign },
    { href: '/reports', label: 'Reports', icon: TrendingUp },
    { href: '/settings', label: 'Settings', icon: Settings },
  ]

  const trainerNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/members', label: 'My Clients', icon: Users },
    { href: '/sessions', label: 'Sessions', icon: Calendar },
    { href: '/performance', label: 'Performance', icon: Activity },
  ]

  const receptionistNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/members', label: 'Members', icon: Users },
    { href: '/payments', label: 'Payments', icon: CreditCard },
    { href: '/packages', label: 'Packages', icon: Package },
  ]

  const memberNavItems = [
    { href: '/member/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/member/profile', label: 'Profile', icon: Users },
    { href: '/member/packages', label: 'Packages', icon: Dumbbell },
    { href: '/member/payments', label: 'Payments', icon: CreditCard },
  ]

  const getNavItems = () => {
    switch (role) {
      case 'gym_owner':
        return ownerNavItems
      case 'manager':
        return managerNavItems
      case 'trainer':
      case 'nutritionist':
        return trainerNavItems
      case 'receptionist':
      case 'housekeeping':
        return receptionistNavItems
      case 'member':
        return memberNavItems
      default:
        return ownerNavItems
    }
  }

  const navItems = getNavItems()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (!user) return null

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Dumbbell className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">GymCRM</span>
            <span className="truncate text-xs">Fitness Management</span>
          </div>
          <ThemeToggle />
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter>
        <div className="p-2">
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-medium">
              {profile?.first_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">
                {profile?.first_name} {profile?.last_name}
              </span>
              <span className="truncate text-xs capitalize">
                {role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
