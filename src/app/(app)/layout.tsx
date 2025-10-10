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
  Users2
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { users } from '@/lib/data';
import { Separator } from '@/components/ui/separator';

const staffUser = users.find(u => u.role === 'staff')!;
const adminUser = users.find(u => u.role === 'admin')!;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Simple logic to switch between user roles for demonstration
  const currentUser = pathname.includes('/admin') ? adminUser : staffUser;

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', adminOnly: false },
    { href: '/live-sessions', icon: Radio, label: 'Live Sessions', adminOnly: false },
  ];

  const adminNavItems = [
    { href: '/admin/courses', icon: BookCopy, label: 'Course Mgmt', adminOnly: true },
    { href: '/admin/staff', icon: Users2, label: 'Staff', adminOnly: true },
    { href: '/admin/analytics', icon: BarChart, label: 'Analytics', adminOnly: true },
  ];

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <Logo className="text-primary-foreground" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}

            {currentUser.role === 'admin' && (
              <SidebarGroup>
                <SidebarGroupLabel>Admin</SidebarGroupLabel>
                {adminNavItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <Link href={item.href}>
                      <SidebarMenuButton
                        isActive={pathname.startsWith(item.href)}
                        tooltip={item.label}
                      >
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
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
                        [...navItems, ...adminNavItems].find(item => pathname.startsWith(item.href))?.label
                    }
                </h1>
            </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
