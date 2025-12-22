
'use client';
import React, { useEffect, useState } from 'react';
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
import { LayoutDashboard, BookCopy, BookMarked, Radio, ShieldCheck, User, CheckCircle, Package, ClipboardCheck, Edit, FilePieChart, UserCheck, Award, Settings, LogOut, Users, Building } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import { NotificationCenter } from '@/components/notification-center';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { logout } from './actions/user-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification, User as UserType, Role as RoleType } from '@prisma/client';
import { Button } from '@/components/ui/button';

type CurrentUser = UserType & { role: RoleType; notifications: Notification[]; isGuest?: boolean };
export const UserContext = React.createContext<string | null>(null);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPublicPage = pathname === '/login' || pathname.startsWith('/login/');

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
                 if (!isPublicPage) router.replace('/login');
            }
        }
        else {
             if (!isPublicPage) router.replace('/login');
        }
      } catch {
         if (!isPublicPage) router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [pathname, router, isPublicPage]);

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

  let currentNavItem;

  if (isSuperAdminPath) {
    currentNavItem = superAdminNavItems.find(item => pathname.startsWith(item.href));
  } else if (isAdminPath) {
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

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  const hasAnyAdminReadAccess = !isGuest && adminNavItems.some(item => item.permission === true);
  const isStaffView = !isAdminPath && !isSuperAdminPath;
  const isSuperAdminRole = !isGuest && userRole?.name === 'Super Admin';

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
                      {isStaffView && <SidebarGroupLabel>Menu</SidebarGroupLabel>}
                      {isStaffView && navItems.map(item => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton isActive={isLinkActive(item.href)} tooltip={item.label}>
                              <item.icon /><span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))}
                  </SidebarGroup>
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
                        <AvatarImage src={currentUser.avatarUrl ?? ''} alt={currentUser.name} />
                        <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <p className="truncate font-semibold text-sm text-sidebar-foreground group-hover:text-sidebar-primary">{currentUser.name}</p>
                        <p className="truncate text-xs text-sidebar-foreground/70">{currentUser.email}</p>
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
                {!isGuest && <NotificationCenter initialNotifications={currentUser.notifications || []} />}
              </header>
              <main className="flex-1 p-4 lg:p-6">{children}</main>
            </SidebarInset>
          </SidebarProvider>
        </UserContext.Provider>
        <Toaster />
      </body>
    </html>
  );
}
