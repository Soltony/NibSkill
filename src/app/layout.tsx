
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  BarChart,
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
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { users } from '@/lib/data';
import { Separator } from '@/components/ui/separator';
import React from 'react';
import { NotificationCenter } from '@/components/notification-center';
import { Toaster } from '@/components/ui/toaster';


const staffUser = users.find(u => u.role === 'staff')!;
const adminUser = users.find(u => u.role === 'admin')!;

// Create a context to provide the user role
export const UserContext = React.createContext<'admin' | 'staff'>('staff');

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Simple logic to switch between user roles for demonstration
  const isAdminView = pathname.startsWith('/admin');
  const currentUser = isAdminView ? adminUser : staffUser;
  const userRole = isAdminView ? 'admin' : 'staff';

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { href: '/learning-paths', icon: BookMarked, label: 'Learning Paths', adminOnly: false },
    { href: '/live-sessions', icon: Radio, label: 'Live Sessions', adminOnly: false },
    { href: '/profile', icon: User, label: 'My Profile', adminOnly: false },
  ];

  const adminNavItems = [
    { href: '/admin/analytics', icon: LayoutDashboard, label: 'Dashboard', adminOnly: true, exact: true },
    { href: '/admin/products', icon: Package, label: 'Products', adminOnly: true },
    { href: '/admin/courses', icon: BookCopy, label: 'Course Mgmt', adminOnly: true },
    { href: '/admin/learning-paths', icon: BookMarked, label: 'Learning Paths', adminOnly: true },
    { href: '/admin/quizzes', icon: ClipboardCheck, label: 'Quiz Mgmt', adminOnly: true },
    { href: '/admin/live-sessions', icon: Radio, label: 'Live Sessions', adminOnly: true },
    { href: '/admin/staff', icon: Users2, label: 'Staff', adminOnly: true },
    { href: '/admin/analytics/progress-report', icon: FilePieChart, label: 'Progress Report', adminOnly: true },
    { href: '/admin/certificate', icon: Award, label: 'Certificate', adminOnly: true },
    { href: '/admin/settings', icon: Settings, label: 'Settings', adminOnly: true },
  ];
  
  const allNavItems = isAdminView ? adminNavItems : navItems;

  const isLinkActive = (path: string, exact?: boolean) => {
    if (exact) {
        return pathname === path;
    }
    return pathname.startsWith(path);
  }

  // This layout is for the main app. The root layout is separate.
  if (pathname.startsWith('/login') || pathname === '/') {
    return (
        <>
            {children}
            <Toaster />
        </>
    );
  }


  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <UserContext.Provider value={userRole}>
          <SidebarProvider>
            <Sidebar>
              <SidebarHeader>
                <Logo className="text-primary-foreground" />
              </SidebarHeader>
              <SidebarContent>
                <SidebarMenu>
                   {isAdminView ? (
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
              </SidebarContent>
              <SidebarFooter>
                <Separator className="my-2 bg-sidebar-border" />
                <div className="flex items-center gap-3 p-2">
                  <Avatar>
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser.name} />
                    <AvatarFallback>
                      {currentUser.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                      <p className="truncate font-semibold text-sm text-sidebar-foreground">{currentUser.name}</p>
                      <p className="truncate text-xs text-sidebar-foreground/70">{currentUser.email}</p>
                  </div>
                  <Link href="/login">
                      <SidebarMenuButton size="sm" variant="outline" className="h-8 w-8 bg-transparent hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground border-sidebar-border">
                          <LogOut />
                      </SidebarMenuButton>
                  </Link>
                </div>
              </SidebarFooter>
            </Sidebar>
            <SidebarInset>
              <header className="flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
                  <SidebarTrigger className="md:hidden"/>
                  <div className="flex-1">
                      <h1 className="text-lg font-semibold md:text-xl font-headline">
                          {
                              [...navItems, ...adminNavItems].find(item => isLinkActive(item.href, item.exact))?.label
                          }
                      </h1>
                  </div>
                  <NotificationCenter />
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
