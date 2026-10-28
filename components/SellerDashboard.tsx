"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  Plus,
  Upload,
  LayoutGrid,
  Clock,
  Columns3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Bell,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  X,
  FileSpreadsheet,
  Check,
  User,
  ExternalLink,
  Gavel,
  MapPin,
  Calendar
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useUser, StudentProfile } from "@/components/UserContext";
import { formatCurrency } from "@/lib/utils";

export interface SellerListingItem {
  id: string;
  seller_id: string;
  title: string;
  category: string;
  description: string | null;
  condition: string;
  images: string[];
  starting_price: number;
  reserve_price: number;
  min_bid_increment: number;
  current_price: number;
  highest_bidder_id: string | null;
  winning_bid_id: string | null;
  status: string;
  start_time: string;
  end_time: string;
  handover_location: string | null;
  handover_status: string;
  bids_count?: number;
  seller?: {
    full_name: string;
    avatar_url: string | null;
    hostel_block: string | null;
    room_number: string | null;
  } | null;
  highest_bidder?: {
    full_name: string;
    avatar_url: string | null;
    hostel_block: string | null;
    room_number: string | null;
  } | null;
}

interface SellerDashboardProps {
  onOpenCreateListing: () => void;
  onOpenDetailModal: (listingId: string) => void;
  onOpenAiDrawer: () => void;
}

export function SellerDashboard({
  onOpenCreateListing,
  onOpenDetailModal,
  onOpenAiDrawer,
}: SellerDashboardProps) {
  const { currentUser, allStudents, switchUser } = useUser();

  const [listings, setListings] = useState<SellerListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"closing_soon" | "most_bids" | "highest_price" | "newest">("closing_soon");
  const [viewMode, setViewMode] = useState<"all" | "mine">("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);

  // Column visibility
  const [showColumnsMenu, setShowColumnsMenu] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    status: true,
    trigger: true,
    lastRun: true,
    runs: true,
    successRate: true,
    avgDuration: true,
    owner: true,
    actions: true,
  });

  // Action Modals State
  const [approveItem, setApproveItem] = useState<SellerListingItem | null>(null);
  const [rejectItem, setRejectItem] = useState<SellerListingItem | null>(null);
  const [handoverItem, setHandoverItem] = useState<SellerListingItem | null>(null);
  const [cancelItem, setCancelItem] = useState<SellerListingItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Keyboard shortcut Ctrl+K & Ctrl+/
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        onOpenAiDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenAiDrawer]);

  // Fetch listings
  const fetchListings = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      // Auto resolve any expired auctions first
      try {
        await supabase.rpc("resolve_closing_auctions");
      } catch (e) {
        // Safe ignore
      }

      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          seller_id,
          title,
          category,
          description,
          condition,
          images,
          starting_price,
          reserve_price,
          min_bid_increment,
          current_price,
          highest_bidder_id,
          winning_bid_id,
          status,
          start_time,
          end_time,
          handover_location,
          handover_status,
          seller:seller_id (
            full_name,
            avatar_url,
            hostel_block,
            room_number
          ),
          highest_bidder:highest_bidder_id (
            full_name,
            avatar_url,
            hostel_block,
            room_number
          )
        `)
        .order("end_time", { ascending: true });

      if (error) {
        console.error("Error fetching seller listings:", error);
        showToast("Error loading listings: " + error.message, "error");
        return;
      }

      if (data) {
        // Fetch bid counts
        const { data: bidsData } = await supabase.from("bids").select("listing_id");
        const counts: Record<string, number> = {};
        if (bidsData) {
          bidsData.forEach((b) => {
            counts[b.listing_id] = (counts[b.listing_id] || 0) + 1;
          });
        }

        const formatted: SellerListingItem[] = data.map((item: any) => ({
          id: item.id,
          seller_id: item.seller_id,
          title: item.title,
          category: item.category,
          description: item.description,
          condition: item.condition,
          images: item.images || [],
          starting_price: Number(item.starting_price),
          reserve_price: Number(item.reserve_price),
          min_bid_increment: Number(item.min_bid_increment),
          current_price: Number(item.current_price),
          highest_bidder_id: item.highest_bidder_id,
          winning_bid_id: item.winning_bid_id,
          status: item.status,
          start_time: item.start_time,
          end_time: item.end_time,
          handover_location: item.handover_location,
          handover_status: item.handover_status,
          bids_count: counts[item.id] || 0,
          seller: item.seller,
          highest_bidder: item.highest_bidder,
        }));

        setListings(formatted);
      }
    } catch (err: any) {
      console.error(err);
      showToast("Unexpected error: " + err.message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();

    const channel = supabase
      .channel("seller-dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => {
        fetchListings(true);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, () => {
        fetchListings(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings]);

  // Filter listings
  const currentSellerListings = useMemo(() => {
    if (viewMode === "all") return listings;
    return listings.filter((l) => l.seller_id === currentUser.id);
  }, [listings, viewMode, currentUser.id]);

  const filteredListings = useMemo(() => {
    let list = [...currentSellerListings];

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        list = list.filter((l) => l.status === "active");
      } else if (statusFilter === "pending_approval") {
        list = list.filter((l) => l.status === "pending_approval");
      } else if (statusFilter === "handover_pending") {
        list = list.filter((l) => l.status === "sold" && l.handover_status !== "completed");
      } else if (statusFilter === "sold") {
        list = list.filter((l) => l.status === "sold" && l.handover_status === "completed");
      } else if (statusFilter === "closed") {
        list = list.filter((l) => l.status === "unsold" || l.status === "rejected" || l.status === "cancelled");
      }
    }

    if (categoryFilter !== "all") {
      list = list.filter((l) => l.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const titleMatch = l.title.toLowerCase().includes(q);
        const catMatch = l.category.toLowerCase().includes(q);
        const bidderMatch = l.highest_bidder?.full_name?.toLowerCase().includes(q);
        const locMatch = l.handover_location?.toLowerCase().includes(q);
        return titleMatch || catMatch || bidderMatch || locMatch;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "closing_soon") {
        return new Date(a.end_time).getTime() - new Date(b.end_time).getTime();
      } else if (sortBy === "most_bids") {
        return (b.bids_count || 0) - (a.bids_count || 0);
      } else if (sortBy === "highest_price") {
        return b.current_price - a.current_price;
      } else if (sortBy === "newest") {
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }
      return 0;
    });

    return list;
  }, [currentSellerListings, statusFilter, categoryFilter, searchQuery, sortBy]);

  // Paginated listings
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / rowsPerPage));
  const paginatedListings = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredListings.slice(start, start + rowsPerPage);
  }, [filteredListings, currentPage, rowsPerPage]);

  // Actions
  const handleApproveWinningPrice = async () => {
    if (!approveItem) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("seller_resolve_auction", {
        p_listing_id: approveItem.id,
        p_seller_id: currentUser.id,
        p_action: "approve",
        p_notes: "Approved by seller via Command Center.",
      });

      if (error) {
        showToast(`Approval failed: ${error.message}`, "error");
        return;
      }

      showToast(`Winning bid of ₹${approveItem.current_price.toLocaleString("en-IN")} approved! Item is reserved for campus handover.`, "success");
      setApproveItem(null);
      await fetchListings(true);
    } catch (err: any) {
      showToast(err.message || "Approval failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectWinningPrice = async () => {
    if (!rejectItem) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("seller_resolve_auction", {
        p_listing_id: rejectItem.id,
        p_seller_id: currentUser.id,
        p_action: "reject",
        p_notes: rejectionNotes || "Seller declined provisional winning bid.",
      });

      if (error) {
        showToast(`Rejection failed: ${error.message}`, "error");
        return;
      }

      showToast("Winning price was rejected. Auction recorded as rejected.", "info");
      setRejectItem(null);
      setRejectionNotes("");
      await fetchListings(true);
    } catch (err: any) {
      showToast(err.message || "Rejection failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmHandover = async () => {
    if (!handoverItem) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("complete_handover", {
        p_listing_id: handoverItem.id,
        p_user_id: currentUser.id,
      });

      if (error) {
        showToast(`Handover failed: ${error.message}`, "error");
        return;
      }

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch (e) {}

      showToast(`Campus handover confirmed! Sale of "${handoverItem.title}" is complete.`, "success");
      setHandoverItem(null);
      await fetchListings(true);
    } catch (err: any) {
      showToast(err.message || "Handover failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelItem) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", cancelItem.id)
        .eq("seller_id", currentUser.id);

      if (error) {
        showToast(`Cancellation failed: ${error.message}`, "error");
        return;
      }

      showToast(`Listing "${cancelItem.title}" has been cancelled.`, "info");
      setCancelItem(null);
      await fetchListings(true);
    } catch (err: any) {
      showToast(err.message || "Cancellation failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (filteredListings.length === 0) {
      showToast("No listings to export.", "info");
      return;
    }
    const headers = ["Title", "Category", "Status", "Starting Price (₹)", "Current Price (₹)", "Bids", "Leading Bidder", "Handover Location", "End Time"];
    const rows = filteredListings.map((l) => [
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.category}"`,
      `"${l.status}"`,
      l.starting_price,
      l.current_price,
      l.bids_count || 0,
      `"${l.highest_bidder?.full_name || "None"}"`,
      `"${(l.handover_location || "").replace(/"/g, '""')}"`,
      `"${new Date(l.end_time).toLocaleString()}"`,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campusbid_listings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported CSV successfully.", "success");
  };

  // Status indicator helper exactly matching reference image concentric ring
  const renderStatus = (item: SellerListingItem) => {
    if (item.status === "active") {
      return (
        <div className="inline-flex items-center">
          <span className="w-3.5 h-3.5 rounded-full border border-emerald-500 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-sm font-normal text-slate-800 ml-2">Active</span>
        </div>
      );
    }
    if (item.status === "pending_approval") {
      return (
        <div className="inline-flex items-center">
          <span className="w-3.5 h-3.5 rounded-full border border-amber-500 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          </span>
          <span className="text-sm font-normal text-slate-800 ml-2">Pending</span>
        </div>
      );
    }
    if (item.status === "sold" && item.handover_status !== "completed") {
      return (
        <div className="inline-flex items-center">
          <span className="w-3.5 h-3.5 rounded-full border border-blue-500 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
          </span>
          <span className="text-sm font-normal text-slate-800 ml-2">Handover</span>
        </div>
      );
    }
    if (item.status === "sold" && item.handover_status === "completed") {
      return (
        <div className="inline-flex items-center">
          <span className="w-3.5 h-3.5 rounded-full border border-purple-500 flex items-center justify-center shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          </span>
          <span className="text-sm font-normal text-slate-800 ml-2">Sold</span>
        </div>
      );
    }
    return (
      <div className="inline-flex items-center">
        <span className="w-3.5 h-3.5 rounded-full border border-slate-400 flex items-center justify-center shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
        </span>
        <span className="text-sm font-normal text-slate-800 ml-2">
          {item.status === "cancelled" ? "Cancelled" : item.status === "rejected" ? "Rejected" : "Unsold"}
        </span>
      </div>
    );
  };

  // Helper for relative time (e.g., "2m ago", "in 45m")
  const formatRelativeTime = (timeStr: string, status: string) => {
    const diff = new Date(timeStr).getTime() - Date.now();
    const isPast = diff <= 0;
    const absSeconds = Math.floor(Math.abs(diff) / 1000);

    if (absSeconds < 60) return isPast ? "just now" : `${absSeconds}s`;
    const minutes = Math.floor(absSeconds / 60);
    if (minutes < 60) return isPast ? `${minutes}m ago` : `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return isPast ? `${hours}h ago` : `in ${hours}h`;
    const days = Math.floor(hours / 24);
    return isPast ? `${days}d ago` : `in ${days}d`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fee2e2] via-[#b91c1c]/70 to-[#450a0a] p-4 sm:p-6 lg:p-8 flex justify-center items-start">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed top-6 right-6 z-50">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium bg-white ${
              toast.type === "success"
                ? "text-emerald-900 border-emerald-200"
                : toast.type === "error"
                ? "text-rose-900 border-rose-200"
                : "text-slate-900 border-slate-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === "info" && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main White Card Window matching design/seller dashboard.webp */}
      <div className="w-full max-w-7xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-white/60 p-6 sm:p-8 flex flex-col min-h-[640px]">
        
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6">
          
          {/* Left: Active Seller Profile Switcher (Sleek, integrated) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-normal">Active Seller:</span>
            <select
              value={currentUser.id}
              onChange={(e) => switchUser(e.target.value)}
              className="text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-slate-300"
            >
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({s.role})
                </option>
              ))}
            </select>
            <button
              onClick={() => setViewMode(viewMode === "all" ? "mine" : "all")}
              className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                viewMode === "all"
                  ? "bg-slate-50 text-slate-700 border-slate-200"
                  : "bg-slate-900 text-white border-slate-900"
              }`}
            >
              {viewMode === "all" ? "All Campus" : "My Items"}
            </button>
          </div>

          {/* Right: Search, Ask AI, Notification Bell */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            
            {/* Search Input */}
            <div className="relative">
              <div className="flex items-center border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-sm text-slate-600 gap-2 focus-within:ring-1 focus-within:ring-slate-300">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search or run a command"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 sm:w-60 bg-transparent text-sm placeholder:text-slate-400 text-slate-800 focus:outline-hidden font-normal"
                />
                <span className="hidden sm:inline text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 font-sans shrink-0">
                  Ctrl K
                </span>
              </div>
            </div>

            {/* AI Assistant Pill Button */}
            <button
              onClick={onOpenAiDrawer}
              className="flex items-center border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-sm text-slate-700 gap-2 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <span className="bg-[#ede7fc] text-[#6b3fe3] text-xs font-semibold px-1.5 py-0.5 rounded">
                AI
              </span>
              <span className="font-medium text-slate-700 text-xs sm:text-sm">Ask AI</span>
              <span className="hidden sm:inline text-xs text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded bg-slate-50 font-sans">
                Ctrl /
              </span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => showToast("Notifications synced live via Supabase", "info")}
              className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 relative transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500"></span>
            </button>

          </div>
        </div>

        {/* Action Row */}
        <div className="flex items-center justify-end gap-2.5 pb-6">
          
          {/* Import Button */}
          <button
            onClick={() => showToast("Import catalog: CSV bulk upload enabled.", "info")}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-700" />
            <span>Import</span>
          </button>

          {/* Templates / Export Button */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-xs"
          >
            <LayoutGrid className="w-4 h-4 text-slate-700" />
            <span>Templates</span>
          </button>

          {/* Primary Action Button: Create listing in brand crimson */}
          <button
            onClick={onOpenCreateListing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create listing</span>
          </button>

        </div>

        {/* Filter Bar Above Table */}
        <div className="flex items-center justify-between gap-4 py-3">
          
          {/* Left: Filter Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            
            {/* Last run / Time pill */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none pl-7 pr-7 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer focus:outline-hidden"
              >
                <option value="closing_soon">Closing soonest</option>
                <option value="most_bids">Most bids</option>
                <option value="highest_price">Highest price</option>
                <option value="newest">Newest</option>
              </select>
              <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Pill */}
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none px-3.5 pr-7 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer focus:outline-hidden"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending_approval">Pending approval</option>
                <option value="handover_pending">Handover pending</option>
                <option value="sold">Sold</option>
                <option value="closed">Closed / Unsold</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Category Pill */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="appearance-none px-3.5 pr-7 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer focus:outline-hidden"
              >
                <option value="all">All categories</option>
                <option value="cycle">Cycle</option>
                <option value="calculator">Calculator</option>
                <option value="books">Books</option>
                <option value="electronics">Electronics</option>
                <option value="hostel essentials">Hostel Essentials</option>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

          </div>

          {/* Right: Workflows count & Columns button */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 font-normal">
              {filteredListings.length} listings
            </span>

            {/* Columns Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
              >
                <Columns3 className="w-3.5 h-3.5 text-slate-400" />
                <span>Columns</span>
              </button>

              {showColumnsMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowColumnsMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 text-xs">
                    <div className="px-3 py-1 font-semibold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      Toggle Columns
                    </div>
                    <div className="p-1 space-y-0.5">
                      {Object.entries({
                        status: "Status",
                        trigger: "Trigger (Item)",
                        lastRun: "Last run (Time)",
                        runs: "Runs (Bids)",
                        successRate: "Success rate (Price)",
                        avgDuration: "Avg duration (Location)",
                        owner: "Owner",
                        actions: "Actions",
                      }).map(([colKey, label]) => (
                        <label
                          key={colKey}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer font-normal text-slate-700"
                        >
                          <input
                            type="checkbox"
                            checked={visibleColumns[colKey]}
                            onChange={(e) =>
                              setVisibleColumns((prev) => ({
                                ...prev,
                                [colKey]: e.target.checked,
                              }))
                            }
                            className="rounded border-slate-300 text-slate-900 focus:ring-0 h-3.5 w-3.5"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>

        {/* The Exact Minimalist Clean Table */}
        <div className="w-full border-t border-slate-100 overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-normal text-slate-500 select-none">
                {visibleColumns.status && <th className="py-3.5 px-4 font-normal w-28">Status</th>}
                {visibleColumns.trigger && <th className="py-3.5 px-4 font-normal min-w-[220px]">Trigger</th>}
                {visibleColumns.lastRun && <th className="py-3.5 px-4 font-normal w-28">Last run ↓</th>}
                {visibleColumns.runs && <th className="py-3.5 px-4 font-normal w-24 text-right">Runs</th>}
                {visibleColumns.successRate && <th className="py-3.5 px-4 font-normal w-28 text-right">Success rate</th>}
                {visibleColumns.avgDuration && <th className="py-3.5 px-4 font-normal min-w-[140px]">Avg. duration</th>}
                {visibleColumns.owner && <th className="py-3.5 px-4 font-normal min-w-[150px]">Owner</th>}
                {visibleColumns.actions && <th className="py-3.5 px-4 font-normal text-right w-24">Actions</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                      <span className="text-xs text-slate-500 font-normal">Loading listings...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedListings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <span className="text-xs text-slate-500 font-normal">No listings found matching your criteria.</span>
                  </td>
                </tr>
              ) : (
                paginatedListings.map((item) => {
                  const isOwner = currentUser.id === item.seller_id;
                  const ownerName = item.highest_bidder?.full_name || item.seller?.full_name || "Campus Student";
                  const avatarUrl =
                    item.highest_bidder?.avatar_url ||
                    item.seller?.avatar_url ||
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80";

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => onOpenDetailModal(item.id)}
                    >
                      {/* Status with Concentric Dot */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-4">
                          {renderStatus(item)}
                        </td>
                      )}

                      {/* Trigger (Item Title) */}
                      {visibleColumns.trigger && (
                        <td className="py-3.5 px-4">
                          <span className="text-sm font-normal text-slate-800 line-clamp-1">
                            {item.title}
                          </span>
                        </td>
                      )}

                      {/* Last Run (Closing / End Time) */}
                      {visibleColumns.lastRun && (
                        <td className="py-3.5 px-4 text-sm font-normal text-slate-500 whitespace-nowrap">
                          {formatRelativeTime(item.end_time, item.status)}
                        </td>
                      )}

                      {/* Runs (Bids Count) */}
                      {visibleColumns.runs && (
                        <td className="py-3.5 px-4 text-sm font-normal text-slate-800 text-right">
                          {(item.bids_count || 0).toLocaleString()}
                        </td>
                      )}

                      {/* Success Rate (Price in ₹) */}
                      {visibleColumns.successRate && (
                        <td className="py-3.5 px-4 text-sm font-normal text-slate-800 text-right">
                          ₹{item.current_price.toLocaleString("en-IN")}
                        </td>
                      )}

                      {/* Avg Duration (Campus Handover Location) */}
                      {visibleColumns.avgDuration && (
                        <td className="py-3.5 px-4 text-sm font-normal text-slate-500 truncate max-w-[160px]">
                          {item.handover_location || "Campus Center"}
                        </td>
                      )}

                      {/* Owner (Leading Bidder / Buyer with Round Avatar) */}
                      {visibleColumns.owner && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <img
                              src={avatarUrl}
                              alt={ownerName}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                            <span className="text-sm font-normal text-slate-800 truncate max-w-[130px]">
                              {ownerName}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Actions */}
                      {visibleColumns.actions && (
                        <td
                          className="py-3.5 px-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            {/* If pending approval and is seller */}
                            {item.status === "pending_approval" && isOwner && (
                              <>
                                <button
                                  onClick={() => setApproveItem(item)}
                                  className="px-2 py-1 rounded text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => setRejectItem(item)}
                                  className="px-2 py-1 rounded text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {/* If handover pending and is seller */}
                            {item.status === "sold" && item.handover_status !== "completed" && isOwner && (
                              <button
                                onClick={() => setHandoverItem(item)}
                                className="px-2 py-1 rounded text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                              >
                                Handover
                              </button>
                            )}

                            {/* If active with 0 bids and is seller */}
                            {item.status === "active" && (item.bids_count || 0) === 0 && isOwner && (
                              <button
                                onClick={() => setCancelItem(item)}
                                className="px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              >
                                Cancel
                              </button>
                            )}

                            {/* View Button */}
                            <button
                              onClick={() => onOpenDetailModal(item.id)}
                              className="px-2 py-1 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination Bar matching design/seller dashboard.webp */}
        <div className="flex items-center justify-end gap-4 pt-4 mt-auto border-t border-slate-100">
          
          {/* Rows Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-normal">Rows</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 bg-white hover:bg-slate-50 focus:outline-hidden"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Page Indicator */}
          <span className="text-xs text-slate-500 font-normal">
            Page {currentPage} of {totalPages}
          </span>

          {/* Arrow Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* Approve Modal */}
      {approveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-medium text-slate-900">Approve Winning Price</h3>
            <p className="text-xs text-slate-600">
              Do you approve the winning price of <strong className="text-slate-900">₹{approveItem.current_price.toLocaleString("en-IN")}</strong> from{" "}
              <strong>{approveItem.highest_bidder?.full_name || "Winner"}</strong> for &ldquo;{approveItem.title}&rdquo;?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setApproveItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveWinningPrice}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#331320] text-white hover:bg-[#47192c]"
              >
                {actionLoading ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-medium text-slate-900">Reject Winning Price</h3>
            <p className="text-xs text-slate-600">
              Rejecting this price ends the auction without reserve. Provide an optional reason for the bidder.
            </p>
            <textarea
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
              placeholder="e.g. Reserve price not met or damaged during exam week..."
              rows={3}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:ring-1 focus:ring-slate-300"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectWinningPrice}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-600 text-white hover:bg-rose-700"
              >
                {actionLoading ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Handover Modal */}
      {handoverItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-medium text-slate-900">Confirm Campus Handover</h3>
            <p className="text-xs text-slate-600">
              Confirm that the item has been physically handed over to{" "}
              <strong>{handoverItem.highest_bidder?.full_name || "Buyer"}</strong> at{" "}
              <strong>{handoverItem.handover_location || "Campus Center"}</strong> and payment is completed.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setHandoverItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHandover}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-[#331320] text-white hover:bg-[#47192c]"
              >
                {actionLoading ? "Completing..." : "Confirm Handover & Finish Sale"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-medium text-slate-900">Cancel Auction</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to cancel &ldquo;{cancelItem.title}&rdquo;? (Only allowed when 0 bids have been placed).
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCancelItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800"
              >
                {actionLoading ? "Cancelling..." : "Cancel Auction"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
