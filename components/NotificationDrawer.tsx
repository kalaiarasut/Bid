"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Bell, 
  CheckCheck, 
  Clock, 
  Gavel, 
  CheckCircle2, 
  AlertTriangle, 
  MessageSquare,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "./UserContext";

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectListing: (listingId: string) => void;
}

interface NotificationItem {
  id: string;
  user_id: string;
  listing_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  onSelectListing,
}: NotificationDrawerProps) {
  const { currentUser, refreshUnreadCount } = useUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const markAllAsRead = async () => {
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      refreshUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "outbid":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "bid_placed":
        return <Gavel className="w-4 h-4 text-emerald-600" />;
      case "auction_won":
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      case "wishlist_match":
        return <Bell className="w-4 h-4 text-blue-600" />;
      case "handover_update":
        return <CheckCircle2 className="w-4 h-4 text-indigo-600" />;
      case "question_answered":
      case "question_received":
        return <MessageSquare className="w-4 h-4 text-purple-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-800" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Campus Alerts
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllAsRead}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Read All
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                <div className="text-xs font-bold text-slate-600">
                  No notifications yet
                </div>
                <div className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  You'll be alerted here when you get outbid, when someone places a bid on your listing, or when a watched item is listed!
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.listing_id) {
                      onSelectListing(item.listing_id);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all text-left flex gap-3 ${
                    item.listing_id ? "cursor-pointer hover:border-slate-400 hover:shadow-xs" : ""
                  } ${
                    item.is_read
                      ? "bg-white border-slate-200 text-slate-600"
                      : "bg-red-50/40 border-red-200 text-slate-900"
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {getIconForType(item.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <div className="text-xs font-bold leading-snug">
                        {item.title}
                      </div>
                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-red-600 shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {item.listing_id && (
                        <span className="text-red-600 font-bold flex items-center gap-0.5 hover:underline">
                          View Auction <ArrowRight className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
