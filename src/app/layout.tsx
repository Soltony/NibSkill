
'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { LayoutDashboard, BookCopy, BookMarked, Radio, CheckCircle, Package, ClipboardCheck, Edit, FilePieChart, UserCheck, Award, Settings, LogOut, Building, ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { NotificationCenter } from '@/components/notification-center';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { logout } from './actions/user-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification, User as UserType, Role as RoleType } from '@prisma/client';
import { Button } from '@/components/ui/button';
import useIdleTimeout from '@/hooks/use-idle-timeout';
import { SessionTimeoutDialog } from '@/components/session-timeout-dialog';

type CurrentUser = UserType & { role: RoleType; notifications: Notification[]; isGuest?: boolean };
export const UserContext = React.createContext<string | null>(null);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const countdownRef = useRef<NodeJS.Timeout>();

  const handleLogout = async () => {
    // Hide the dialog and clear countdown immediately
    setShowTimeoutDialog(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    try {
      // Ensure server revokes session and clears auth cookies
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors - still redirect to login
    } finally {
      // Force a full page navigation so cookies cleared by the server are respected
        router.push('/login');
    }
  }; 

  const onIdle = () => {
    if (currentUser && !currentUser.isGuest) {
      setShowTimeoutDialog(true);
      setCountdown(60);
      // Prevent duplicate intervals
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            // Hide the dialog immediately and trigger logout
            setShowTimeoutDialog(false);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const { resetTimer } = useIdleTimeout(15 * 60 * 1000, onIdle); // 15 minutes

  const handleContinueSession = () => {
    setShowTimeoutDialog(false);
    if (countdownRef.current) {
        clearInterval(countdownRef.current);
    }
    resetTimer();
  };

  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/') || pathname === '/change-password';

  useEffect(() => {
    async function fetchUser() {
      if (isPublicPage) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        const res = await fetch('/api/auth/session');
        if (res.ok) {
            const user = await res.json();
            if (user) {
                setCurrentUser(user);
            } else {
                 if (!isPublicPage) window.location.href = '/login';
            }
        }
        else {
             if (!isPublicPage) window.location.href = '/login';
        }
      } catch {
         if (!isPublicPage) window.location.href = '/login';
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [pathname, isPublicPage]);

  const userRole = currentUser?.role;
  const permissions = userRole?.permissions as any;
  const isGuest = currentUser?.isGuest;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/learning-paths', icon: BookMarked, label: 'Learning Paths' },
    { href: '/live-sessions', icon: Radio, label: 'Live Sessions' },
  ];

  const adminNavItems = [
    { href: '/admin/analytics', icon: LayoutDashboard, label: 'Dashboard', permission: permissions?.dashboard?.r },
    { href: '/admin/products', icon: Package, label: 'Products', permission: permissions?.products?.r },
    { href: '/admin/courses/list', icon: BookCopy, label: 'Course Mgmt', permission: permissions?.courses?.r },
    { href: '/admin/courses/approvals', icon: CheckCircle, label: 'Approvals', permission: permissions?.approvals?.r },
    { href: '/admin/learning-paths', icon: BookMarked, label: 'Learning Paths', permission: permissions?.learningPaths?.r },
    { href: '/admin/quizzes', icon: ClipboardCheck, label: 'Quiz Mgmt', permission: permissions?.quizzes?.r },
    { href: '/admin/grading', icon: Edit, label: 'Grading', permission: permissions?.grading?.r },
    { href: '/admin/live-sessions', icon: Radio, label: 'Live Sessions', permission: permissions?.liveSessions?.r },
    { href: '/admin/analytics/progress-report', icon: FilePieChart, label: 'Progress Report', permission: permissions?.reports?.r },
    { href: '/admin/analytics/attendance-report', icon: UserCheck, label: 'Attendance Report', permission: permissions?.reports?.r },
    { href: '/admin/certificate', icon: Award, label: 'Certificate', permission: permissions?.certificate?.r },
    { href: '/admin/settings', icon: Settings, label: 'Settings', permission: permissions?.settings?.r },
  ];

  const superAdminNavItems = [
      { href: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/super-admin/providers', icon: Building, label: 'Providers' }
  ];
  const isAdminPath = pathname.startsWith('/admin');
  const isSuperAdminPath = pathname.startsWith('/super-admin');

  const roleName = userRole?.name;
  const isSuperAdminRole = !isGuest && roleName === 'Super Admin';
  const isAdminRole = !isGuest && (roleName === 'Admin' || roleName === 'Training Provider');
  const isStaffRole = !isGuest && roleName === 'Staff';

  let currentNavItem;

  if (isSuperAdminRole) {
    currentNavItem = superAdminNavItems.find(item => pathname.startsWith(item.href));
  } else if (isAdminRole) {
    currentNavItem = adminNavItems.find(item => pathname.startsWith(item.href));
  } else {
    currentNavItem = navItems.find(item => pathname.startsWith(item.href));
  }

  if (isPublicPage) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head>
          <title>NIB Training</title>
          <meta name="description" content="Corporate Training and Digital Product Management" />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link
            href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>{children}<Toaster /></body>
      </html>
    );
  }

  if (isLoading || !currentUser) {
    return (
      <html lang="en" suppressHydrationWarning>
        <head><title>NIB Training</title></head>
        <body className="flex items-center justify-center min-h-screen"><Logo /></body>
      </html>
    );
  }

  const isLinkActive = (path: string) => {
    if (path === '/super-admin/dashboard' || path === '/admin/analytics' || path === '/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  }

  const hasAnyAdminReadAccess = !isGuest && adminNavItems.some(item => item.permission === true);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>NIB Training</title>
        <meta name="description" content="Corporate Training and Digital Product Management" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <UserContext.Provider value={isGuest ? 'guest' : userRole?.name.toLowerCase() || null}>
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader><Logo className="text-primary-foreground" /></SidebarHeader>
              <SidebarContent>
                <SidebarMenu>
                  <SidebarGroup>
                      <SidebarGroupLabel>
                        {isSuperAdminRole ? 'Super Admin' : isAdminRole ? 'Admin Menu' : 'Menu'}
                      </SidebarGroupLabel>
                      {isSuperAdminRole && superAdminNavItems.map(item => (
                         <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton isActive={isLinkActive(item.href)} tooltip={item.label}>
                              <item.icon /><span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                      {isAdminRole && adminNavItems.map(item => (
                         item.permission && (
                            <SidebarMenuItem key={item.href}>
                            <Link href={item.href}>
                                <SidebarMenuButton isActive={isLinkActive(item.href)} tooltip={item.label}>
                                <item.icon /><span>{item.label}</span>
                                </SidebarMenuButton>
                            </Link>
                            </SidebarMenuItem>
                         )
                      ))}
                      {!isAdminRole && !isSuperAdminRole && navItems.map(item => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton isActive={isLinkActive(item.href)} tooltip={item.label}>
                              <item.icon /><span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                    </SidebarGroup>

                    {isSuperAdminRole && !isSuperAdminPath && (
                       <SidebarMenuItem>
                          <Link href="/super-admin">
                            <SidebarMenuButton tooltip="Super Admin"><ShieldCheck /><span>Super Admin</span></SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                    )}
                  </SidebarMenu>
              </SidebarContent>
              <SidebarFooter>
                <Separator className="my-2 bg-sidebar-border" />
                {isGuest ? (
                   <div className="p-2">
                     <Button asChild className="w-full">
                       <Link href="/login/register">Sign Up / Login</Link>
                     </Button>
                   </div>
                ) : (
                  <div className="flex items-center gap-3 p-2">
                    <Link href="/profile" className="flex-1 flex items-center gap-3 overflow-hidden group">
                      <Avatar>
                        <AvatarImage src={currentUser?.avatarUrl ?? ''} alt={currentUser?.name} />
                        <AvatarFallback>{currentUser?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-semibold text-sm text-sidebar-foreground group-hover:text-sidebar-primary">{currentUser?.name}</p>
                        <p className="truncate text-xs text-sidebar-foreground/70">{currentUser?.email}</p>
                      </div>
                    </Link>
                    <form action={handleLogout}>
                      <SidebarMenuButton type="submit" size="sm" variant="outline" className="h-8 w-8 bg-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground border-sidebar-border">
                        <LogOut />
                      </SidebarMenuButton>
                    </form>
                  </div>
                )}
              </SidebarFooter>
            </Sidebar>
            <SidebarInset>
              <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
                <SidebarTrigger className="md:hidden" />
                <div className="flex-1">
                  <h1 className="text-lg font-semibold md:text-xl font-headline">{currentNavItem?.label || 'Dashboard'}</h1>
                </div>
                {!isGuest && <NotificationCenter initialNotifications={currentUser?.notifications || []} />}
              </header>
              <main className="flex-1 p-4 lg:p-6">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </UserContext.Provider>
        <Toaster />
        {!isPublicPage && !isGuest && (
            <SessionTimeoutDialog
            open={showTimeoutDialog}
            onContinue={handleContinueSession}
            onLogout={handleLogout}
            countdown={countdown}
            />
        )}
      </body>
    </html>
  );
}
