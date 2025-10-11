
"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { notifications as initialNotifications, type Notification } from "@/lib/data";
import { ScrollArea } from "./ui/scroll-area";
import { cn } from "@/lib/utils";
import { Badge } from "./ui/badge";

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications(
      notifications.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };
  
  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({...n, isRead: true})));
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "min ago";
    return Math.floor(seconds) + "s ago";
  }


  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">Notifications</h3>
          <Button variant="link" size="sm" className="p-0 h-auto" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
            Mark all as read
          </Button>
        </div>
        <ScrollArea className="h-96">
            {notifications.length > 0 ? (
                notifications.map(notification => (
                    <div key={notification.id} className="border-b p-4 last:border-b-0 hover:bg-muted/50">
                        <div className="flex items-start gap-3">
                            <div className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", !notification.isRead && "bg-primary")} />
                            <div className="flex-1 space-y-1">
                                <p className="font-medium">{notification.title}</p>
                                <p className="text-sm text-muted-foreground">{notification.description}</p>
                                <p className="text-xs text-muted-foreground">{getTimeAgo(notification.createdAt)}</p>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    You have no new notifications.
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
