
'use client';
import type { Metadata } from 'next';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
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
import {
  BookCopy,
  LayoutDashboard,
  LogOut,
  Radio,
  Users2,
  Package,
  Settings,
  ClipboardCheck,
  Award,
  BookMarked,
  User,
  FilePieChart,
  UserCheck,
  Edit,
  Bell,
  ShieldCheck,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { Separator } from '@/components/ui/separator';
import React, { useEffect, useState } from 'react';
import { NotificationCenter } from '@/components/notification-center';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { Inter } from 'next/font/google';
import { logout } from './actions/user-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification, User as UserType, Role as RoleType } from '@prisma/client';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// This would typically come from a session context
type CurrentUser = UserType & {
  role: RoleType;
  notifications: Notification[];
};

// Create a context to provide the user role and permissions
export const UserContext = React.createContext<{ roleName: string | null; permissions: any } | null>(null);


export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isPublicPage = pathname.startsWith('/login') || pathname === '/';
  const isSuperAdminLogin = pathname === '/login/super-admin';

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
            router.replace(isSuperAdminLogin ? '/login/super-admin' : '/login');
          }
        } else {
           router.replace(isSuperAdminLogin ? '/login/super-admin' : '/login');
        }
      } catch (error) {
         console.error("Failed to fetch user", error);
         router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, [pathname, isPublicPage, router, isSuperAdminLogin]);

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
            <body className={`${inter.variable} font-body antialiased`}>
                {children}
                <Toaster />
            </body>
        </html>
    );
  }

  if (isLoading) {
      return (
        <html lang="en" suppressHydrationWarning>
            <head>
              <title>NIB Training</title>
            </head>
            <body className={`${inter.variable} font-body antialiased`}>
                <div className="flex items-center justify-center min-h-screen">
                    <Logo />
                </div>
            </body>
        </html>
      )
  }

  const userRole = currentUser?.role;
  const permissions = userRole?.permissions as any;
  const userRoleName = userRole?.name.toLowerCase() || 'staff';
  
  const canViewAdmin = permissions?.courses?.r === true;
  const isAdminView = pathname.startsWith('/admin') && canViewAdmin;
  const isSuperAdminView = pathname.startsWith('/super-admin') && userRoleName === 'super admin';

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { href: '/courses', icon: BookCopy, label: 'Courses', adminOnly: false },
    { href: '/learning-paths', icon: BookMarked, label: 'Learning Paths', adminOnly: false },
    { href: '/live-sessions', icon: Radio, label: 'Live Sessions', adminOnly: false },
  ];

  const adminNavItems = [
    { href: '/admin/analytics', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true, exact: true },
    { href: '/admin/products', icon: Package, label: 'Products', adminOnly: true },
    { href: '/admin/courses/list', icon: BookCopy, label: 'Course Mgmt', adminOnly: true },
    { href: '/admin/learning-paths', icon: BookMarked, label: 'Learning Paths', adminOnly: true },
    { href: '/admin/quizzes', icon: ClipboardCheck, label: 'Quiz Mgmt', adminOnly: true },
    { href: '/admin/grading', icon: Edit, label: 'Grading', adminOnly: true },
    { href: '/admin/live-sessions', icon: Radio, label: 'Live Sessions', adminOnly: true },
    { href: '/admin/staff', icon: Users2, label: 'Staff', adminOnly: true },
    { href: '/admin/analytics/progress-report', icon: FilePieChart, label: 'Progress Report', adminOnly: true },
    { href: '/admin/analytics/attendance-report', icon: UserCheck, label: 'Attendance Report', adminOnly: true },
    { href: '/admin/certificate', icon: Award, label: 'Certificate', adminOnly: true },
    { href: '/admin/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];
  
  const superAdminNavItems = [
    { href: '/super-admin', icon: ShieldCheck, label: 'Super Admin', adminOnly: true, exact: true },
  ];
  
  let currentNavItems;
  if (isSuperAdminView) {
    currentNavItems = superAdminNavItems;
  } else if (isAdminView) {
    currentNavItems = adminNavItems;
  } else {
    currentNavItems = navItems;
  }
  

  const isLinkActive = (path: string, exact?: boolean) => {
    if (exact) {
        return pathname === path;
    }
    if (path === '/courses' && pathname.startsWith('/courses/')) {
        return true;
    }
    return pathname.startsWith(path);
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };
  
  const showStaffViewToggle = canViewAdmin;
  const showSuperAdminViewToggle = userRoleName === 'super admin';

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
      <body className={`${inter.variable} font-body antialiased`}>
        <UserContext.Provider value={{ roleName: userRoleName, permissions }}>
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader>
                <Logo className="text-primary-foreground" />
              </SidebarHeader>
              <SidebarContent>
                 {isLoading ? (
                    <div className="space-y-2 p-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : (
                  <SidebarMenu>
                    {isSuperAdminView ? (
                      <>
                        <SidebarGroup>
                          <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
                          {superAdminNavItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                              <Link href={item.href}>
                                <SidebarMenuButton
                                  isActive={isLinkActive(item.href, item.exact)}
                                  tooltip={item.label}
                                >
                                  <item.icon />
                                  <span>{item.label}</span>
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                          ))}
                        </SidebarGroup>
                         <SidebarMenuItem>
                            <Link href={'/admin/analytics'}>
                              <SidebarMenuButton
                                isActive={isLinkActive('/admin/analytics')}
                                tooltip={'Admin Dashboard'}
                              >
                                <LayoutDashboard />
                                <span>Admin View</span>
                              </SidebarMenuButton>
                            </Link>
                          </SidebarMenuItem>
                      </>
                    ) : isAdminView ? (
                      <>
                        <SidebarGroup>
                          <SidebarGroupLabel>Admin</SidebarGroupLabel>
                          {adminNavItems.map((item) => (
                            <SidebarMenuItem key={item.href}>
                              <Link href={item.href}>
                                <SidebarMenuButton
                                  isActive={isLinkActive(item.href, item.exact)}
                                  tooltip={item.label}
                                >
                                  <item.icon />
                                  <span>{item.label}</span>
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                          ))}
                        </SidebarGroup>
                          {showSuperAdminViewToggle && (
                            <SidebarMenuItem>
                                <Link href={'/super-admin'}>
                                <SidebarMenuButton
                                    isActive={isLinkActive('/super-admin')}
                                    tooltip={'Super Admin Dashboard'}
                                >
                                    <ShieldCheck />
                                    <span>Super Admin</span>
                                </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                          )}
                          {showStaffViewToggle && (
                            <SidebarMenuItem>
                              <Link href={'/dashboard'}>
                                <SidebarMenuButton
                                  isActive={isLinkActive('/dashboard')}
                                  tooltip={'Staff Dashboard'}
                                >
                                  <LayoutDashboard />
                                  <span>Staff View</span>
                                </SidebarMenuButton>
                              </Link>
                            </SidebarMenuItem>
                          )}
                      </>
                    ) : (
                      navItems.map((item) => (
                        <SidebarMenuItem key={item.href}>
                          <Link href={item.href}>
                            <SidebarMenuButton
                              isActive={isLinkActive(item.href)}
                              tooltip={item.label}
                            >
                              <item.icon />
                              <span>{item.label}</span>
                            </SidebarMenuButton>
                          </Link>
                        </SidebarMenuItem>
                      ))
                    )}
                  </SidebarMenu>
                )}
              </SidebarContent>
              <SidebarFooter>
                <Separator className="my-2 bg-sidebar-border" />
                 {isLoading || !currentUser ? (
                    <div className="flex items-center gap-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-32" />
                        </div>
                    </div>
                ) : (
                  <div className="flex items-center gap-3 p-2">
                    <Link href="/profile" className="flex-1 flex items-center gap-3 overflow-hidden group">
                      <Avatar>
                        <AvatarImage src={currentUser.avatarUrl ?? ''} alt={currentUser.name} />
                        <AvatarFallback>
                          {currentUser.name.charAt(0)}
                        </AvatarFallback>
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
                  <SidebarTrigger className="md:hidden"/>
                  <div className="flex-1">
                      <h1 className="text-lg font-semibold md:text-xl font-headline">
                          {
                              currentNavItems.find(item => isLinkActive(item.href, item.exact))?.label
                          }
                      </h1>
                  </div>
                  {currentUser && <NotificationCenter initialNotifications={currentUser.notifications} />}
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
