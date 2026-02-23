import { supabase } from "./supabase";

export interface AppNotification {
  id: string;
  type: "new_alert" | "action_due" | "doc_approved" | "doc_updated";
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
}

export async function loadUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);

  if (error) throw error;
  return count ?? 0;
}

export async function loadNotifications(limit = 20): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as AppNotification[];
}

export async function markAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);

  if (error) throw error;
}

export async function markAllAsRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("read", false);

  if (error) throw error;
}
