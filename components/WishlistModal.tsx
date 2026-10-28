"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Bookmark, 
  Bell, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "./UserContext";

interface WishlistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WishlistAlert {
  id: string;
  user_id: string;
  keyword: string;
  category: string | null;
  max_price: number | null;
  is_active: boolean;
  created_at: string;
}

export function WishlistModal({ isOpen, onClose }: WishlistModalProps) {
  const { currentUser } = useUser();
  const [alerts, setAlerts] = useState<WishlistAlert[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [browserNotificationStatus, setBrowserNotificationStatus] = useState<string>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserNotificationStatus(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const perm = await Notification.requestPermission();
      setBrowserNotificationStatus(perm);
      if (perm === "granted") {
        new Notification("CampusBid Alerts Active!", {
          body: "You will receive desktop alerts when watched items are listed or when you get outbid.",
          icon: "/favicon.ico",
        });
      }
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from("wishlist_alerts")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAlerts(data);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAlerts();
    }
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("wishlist_alerts").insert({
        user_id: currentUser.id,
        keyword: keyword.trim(),
        category: category === "all" ? null : category,
        max_price: maxPrice ? parseFloat(maxPrice) : null,
        is_active: true,
      });

      if (!error) {
        setKeyword("");
        setMaxPrice("");
        fetchAlerts();
      }
    } catch (err) {
      console.error("Error creating alert:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await supabase.from("wishlist_alerts").delete().eq("id", id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-red-600" />
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Never Miss What You Need
              </h2>
              <p className="text-[11px] text-slate-500">
                Instant alerts when matching items are listed on campus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Browser Notification Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
            <Bell className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-bold text-amber-900">
                Background Browser Notifications
              </div>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                Receive popup alerts even when CampusBid is open in a background tab or when you're in class.
              </p>
              <div className="mt-2">
                {browserNotificationStatus === "granted" ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-sm">
                    <CheckCircle2 className="w-3 h-3" /> Notifications Allowed
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={requestBrowserPermission}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-2xs"
                  >
                    Enable Browser Alerts
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Add New Alert Form */}
          <form onSubmit={handleAddAlert} className="space-y-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Create a Watched Alert Rule
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Keyword or Item Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. scientific calculator, 21-speed cycle, maths book"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                >
                  <option value="all">Any Category</option>
                  <option value="Cycle">Cycle</option>
                  <option value="Calculator">Calculator</option>
                  <option value="Books">Books</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Hostel">Hostel</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Max Budget (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g. 400"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !keyword.trim()}
              className="w-full py-2 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save Alert Trigger</span>
            </button>
          </form>

          {/* Active Alerts List */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Your Active Alerts ({alerts.length})</span>
            </div>

            {alerts.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No active alerts yet. Add what you're looking for above!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        "{alert.keyword}"
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {alert.category ? alert.category : "Any Category"} •{" "}
                        {alert.max_price ? `Up to ₹${alert.max_price}` : "Any price"}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 rounded-sm hover:bg-red-50 transition-colors"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
