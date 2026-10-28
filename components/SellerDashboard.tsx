"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Search,
  SlidersHorizontal,
  PlusCircle,
  RefreshCw,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Gavel,
  MapPin,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  ArrowUpDown,
  Tag,
  Check,
  X,
  User,
  ExternalLink,
  Sparkles,
  Building,
  Calendar,
  IndianRupee,
  HelpCircle,
  FileText,
  Ban,
  Filter,
  CheckCheck,
  Columns3,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useUser, StudentProfile } from "@/components/UserContext";
import { formatCurrency } from "@/lib/utils";

export interface BidDetail {
  id: string;
  listing_id: string;
  bidder_id: string;
  amount: number;
  is_proxy_bid: boolean;
  max_proxy_amount: number | null;
  created_at: string;
  bidder?: {
    full_name: string;
    avatar_url: string | null;
    hostel_block: string | null;
    room_number: string | null;
  } | null;
}

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
  handover_completed_at: string | null;
  seller_notes: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
  seller?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    hostel_block: string | null;
    room_number: string | null;
    rating: number;
  } | null;
  highest_bidder?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    hostel_block: string | null;
    room_number: string | null;
    phone_number: string | null;
  } | null;
  bids_count: number;
  bids?: BidDetail[];
}

export interface SellerDashboardProps {
  onOpenCreateListing?: () => void;
  onOpenCreateModal?: () => void;
  onOpenDetailModal?: (listingId: string) => void;
  onOpenAiDrawer?: () => void;
}

export function SellerDashboard({
  onOpenCreateListing,
  onOpenCreateModal,
  onOpenDetailModal,
  onOpenAiDrawer,
}: SellerDashboardProps) {
  const triggerCreate = onOpenCreateListing || onOpenCreateModal;
  const { currentUser, allStudents, switchUser } = useUser();

  // Data state
  const [listings, setListings] = useState<SellerListingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"mine" | "all">("mine");

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusTab, setStatusTab] = useState<
    "all" | "active" | "pending_approval" | "handover_pending" | "sold" | "closed"
  >("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"closing_soon" | "highest_bid" | "most_bids" | "newest">("closing_soon");

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Column visibility
  const [showColumnsMenu, setShowColumnsMenu] = useState<boolean>(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({
    status: true,
    item: true,
    currentBid: true,
    bidsCount: true,
    leadingBidder: true,
    countdown: true,
    handover: true,
    actions: true,
  });

  // Action Modals State
  const [approveItem, setApproveItem] = useState<SellerListingItem | null>(null);
  const [customHandoverLocation, setCustomHandoverLocation] = useState<string>("");
  const [approvalNotes, setApprovalNotes] = useState<string>("");

  const [rejectItem, setRejectItem] = useState<SellerListingItem | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<string>("");

  const [handoverItem, setHandoverItem] = useState<SellerListingItem | null>(null);
  const [cancelItem, setCancelItem] = useState<SellerListingItem | null>(null);

  const [historyItem, setHistoryItem] = useState<SellerListingItem | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  // Clock tick for live countdowns
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto tick every second for real-time countdown sync
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Global Ctrl+K / Ctrl+/ shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        if (onOpenAiDrawer) onOpenAiDrawer();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onOpenAiDrawer]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Fetch listings and transparent bid histories
  const fetchListings = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      // 1. Fetch listings with seller and leading bidder profiles
      const { data: listingsData, error: listingsError } = await supabase
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
          handover_completed_at,
          seller_notes,
          view_count,
          created_at,
          updated_at,
          seller:seller_id (
            id,
            full_name,
            email,
            avatar_url,
            hostel_block,
            room_number,
            rating
          ),
          highest_bidder:highest_bidder_id (
            id,
            full_name,
            email,
            avatar_url,
            hostel_block,
            room_number,
            phone_number
          )
        `)
        .order("created_at", { ascending: false });

      if (listingsError) {
        console.error("Error fetching seller listings:", listingsError);
        showToast("Failed to fetch listings. Check Supabase connection.", "error");
        return;
      }

      // 2. Fetch all bids to compute counts and transparent logs
      const { data: bidsData, error: bidsError } = await supabase
        .from("bids")
        .select(`
          id,
          listing_id,
          bidder_id,
          amount,
          is_proxy_bid,
          max_proxy_amount,
          created_at,
          bidder:bidder_id (
            full_name,
            avatar_url,
            hostel_block,
            room_number
          )
        `)
        .order("created_at", { ascending: false });

      if (bidsError) {
        console.warn("Error fetching bids history:", bidsError);
      }

      const bidsGrouped: Record<string, BidDetail[]> = {};
      if (bidsData) {
        bidsData.forEach((b: any) => {
          if (!bidsGrouped[b.listing_id]) {
            bidsGrouped[b.listing_id] = [];
          }
          bidsGrouped[b.listing_id].push({
            id: b.id,
            listing_id: b.listing_id,
            bidder_id: b.bidder_id,
            amount: Number(b.amount),
            is_proxy_bid: b.is_proxy_bid,
            max_proxy_amount: b.max_proxy_amount ? Number(b.max_proxy_amount) : null,
            created_at: b.created_at,
            bidder: b.bidder ? {
              full_name: b.bidder.full_name,
              avatar_url: b.bidder.avatar_url,
              hostel_block: b.bidder.hostel_block,
              room_number: b.bidder.room_number,
            } : null,
          });
        });
      }

      const formatted: SellerListingItem[] = (listingsData || []).map((item: any) => {
        const itemBids = bidsGrouped[item.id] || [];
        return {
          id: item.id,
          seller_id: item.seller_id,
          title: item.title,
          category: item.category,
          description: item.description,
          condition: item.condition,
          images: item.images || [],
          starting_price: Number(item.starting_price),
          reserve_price: Number(item.reserve_price || 0),
          min_bid_increment: Number(item.min_bid_increment || 10),
          current_price: Number(item.current_price),
          highest_bidder_id: item.highest_bidder_id,
          winning_bid_id: item.winning_bid_id,
          status: item.status,
          start_time: item.start_time,
          end_time: item.end_time,
          handover_location: item.handover_location,
          handover_status: item.handover_status,
          handover_completed_at: item.handover_completed_at,
          seller_notes: item.seller_notes,
          view_count: Number(item.view_count || 0),
          created_at: item.created_at,
          updated_at: item.updated_at,
          seller: item.seller ? {
            id: item.seller.id,
            full_name: item.seller.full_name,
            email: item.seller.email,
            avatar_url: item.seller.avatar_url,
            hostel_block: item.seller.hostel_block,
            room_number: item.seller.room_number,
            rating: Number(item.seller.rating || 5.0),
          } : null,
          highest_bidder: item.highest_bidder ? {
            id: item.highest_bidder.id,
            full_name: item.highest_bidder.full_name,
            email: item.highest_bidder.email,
            avatar_url: item.highest_bidder.avatar_url,
            hostel_block: item.highest_bidder.hostel_block,
            room_number: item.highest_bidder.room_number,
            phone_number: item.highest_bidder.phone_number,
          } : null,
          bids_count: itemBids.length,
          bids: itemBids,
        };
      });

      setListings(formatted);
    } catch (err) {
      console.error(err);
      showToast("An unexpected error occurred while fetching data.", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  // Realtime subscription for instantaneous updates on bids or status changes
  useEffect(() => {
    const channel = supabase
      .channel("seller-dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => {
          fetchListings(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids" },
        () => {
          fetchListings(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchListings]);

  // Filter listings based on "mine" vs "all"
  const currentSellerListings = useMemo(() => {
    if (viewMode === "all") return listings;
    return listings.filter((l) => l.seller_id === currentUser.id);
  }, [listings, viewMode, currentUser.id]);

  // Metric Summary KPIs computed from current seller listings
  const metrics = useMemo(() => {
    const active = currentSellerListings.filter((l) => l.status === "active");
    const pendingApproval = currentSellerListings.filter((l) => l.status === "pending_approval");
    const handoverPending = currentSellerListings.filter(
      (l) => l.status === "sold" && l.handover_status !== "completed"
    );
    const completed = currentSellerListings.filter(
      (l) => l.status === "sold" && l.handover_status === "completed"
    );

    const totalBids = currentSellerListings.reduce((acc, curr) => acc + (curr.bids_count || 0), 0);
    const totalVolume = completed.reduce((acc, curr) => acc + curr.current_price, 0);
    const totalActiveVolume = active.reduce((acc, curr) => acc + curr.current_price, 0);

    return {
      activeCount: active.length,
      totalBids,
      awaitingCount: pendingApproval.length + handoverPending.length,
      pendingApprovalCount: pendingApproval.length,
      handoverPendingCount: handoverPending.length,
      totalVolume,
      totalActiveVolume,
      completedCount: completed.length,
    };
  }, [currentSellerListings]);

  // Status Tab counts for tabs
  const tabCounts = useMemo(() => {
    const all = currentSellerListings.length;
    const active = currentSellerListings.filter((l) => l.status === "active").length;
    const pendingApproval = currentSellerListings.filter((l) => l.status === "pending_approval").length;
    const handoverPending = currentSellerListings.filter(
      (l) => l.status === "sold" && l.handover_status !== "completed"
    ).length;
    const sold = currentSellerListings.filter(
      (l) => l.status === "sold" && l.handover_status === "completed"
    ).length;
    const closed = currentSellerListings.filter(
      (l) => l.status === "unsold" || l.status === "rejected" || l.status === "cancelled"
    ).length;

    return {
      all,
      active,
      pending_approval: pendingApproval,
      handover_pending: handoverPending,
      sold,
      closed,
    };
  }, [currentSellerListings]);

  // Filtered and Sorted Table Data
  const filteredListings = useMemo(() => {
    let list = [...currentSellerListings];

    // Status tab filter
    if (statusTab === "active") {
      list = list.filter((l) => l.status === "active");
    } else if (statusTab === "pending_approval") {
      list = list.filter((l) => l.status === "pending_approval");
    } else if (statusTab === "handover_pending") {
      list = list.filter((l) => l.status === "sold" && l.handover_status !== "completed");
    } else if (statusTab === "sold") {
      list = list.filter((l) => l.status === "sold" && l.handover_status === "completed");
    } else if (statusTab === "closed") {
      list = list.filter(
        (l) => l.status === "unsold" || l.status === "rejected" || l.status === "cancelled"
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      list = list.filter((l) => l.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((l) => {
        const titleMatch = l.title.toLowerCase().includes(q);
        const categoryMatch = l.category.toLowerCase().includes(q);
        const descMatch = l.description?.toLowerCase().includes(q);
        const locationMatch = l.handover_location?.toLowerCase().includes(q);
        const bidderMatch = l.highest_bidder?.full_name?.toLowerCase().includes(q);
        const hostelMatch = l.highest_bidder?.hostel_block?.toLowerCase().includes(q);
        const sellerMatch = l.seller?.full_name?.toLowerCase().includes(q);
        return (
          titleMatch ||
          categoryMatch ||
          descMatch ||
          locationMatch ||
          bidderMatch ||
          hostelMatch ||
          sellerMatch
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "closing_soon") {
        const timeA = new Date(a.end_time).getTime();
        const timeB = new Date(b.end_time).getTime();
        return timeA - timeB;
      }
      if (sortBy === "highest_bid") {
        return b.current_price - a.current_price;
      }
      if (sortBy === "most_bids") {
        return b.bids_count - a.bids_count;
      }
      if (sortBy === "newest") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

    return list;
  }, [currentSellerListings, statusTab, categoryFilter, searchQuery, sortBy]);

  // Paginated subset
  const totalPages = Math.max(1, Math.ceil(filteredListings.length / rowsPerPage));
  const paginatedListings = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return filteredListings.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredListings, currentPage, rowsPerPage]);

  // Reset to page 1 if query/tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusTab, categoryFilter, rowsPerPage, viewMode]);

  // Handover Location presets for rapid approval
  const LOCATION_PRESETS = [
    currentUser.hostel_block ? `${currentUser.hostel_block} Gate` : "Hostel Gate",
    "Central Library Entrance",
    "Campus Student Activity Center (SAC)",
    "Department Ground Floor Lobby",
    "Campus Cafeteria Outside Steps",
  ];

  // =========================================================================
  // Operational Actions (Supabase RPCs)
  // =========================================================================

  // 1. Approve Winning Price
  const handleConfirmApproval = async () => {
    if (!approveItem) return;
    setActionLoading(true);
    try {
      const finalLocation = customHandoverLocation.trim() || approveItem.handover_location || "Hostel Gate";
      const { data, error } = await supabase.rpc("seller_resolve_auction", {
        p_listing_id: approveItem.id,
        p_seller_id: currentUser.id,
        p_approve: true,
        p_handover_location: finalLocation,
        p_notes: approvalNotes.trim() || "Approved by seller for campus handover.",
      });

      if (error) {
        console.error("Error approving price:", error);
        showToast(`Approval failed: ${error.message}`, "error");
        return;
      }

      showToast(`Winning price approved! Handover scheduled at ${finalLocation}.`, "success");
      setApproveItem(null);
      setCustomHandoverLocation("");
      setApprovalNotes("");
      await fetchListings(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Approval failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Reject Winning Price
  const handleConfirmRejection = async () => {
    if (!rejectItem) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("seller_resolve_auction", {
        p_listing_id: rejectItem.id,
        p_seller_id: currentUser.id,
        p_approve: false,
        p_notes: rejectionNotes.trim() || "Price rejected by seller.",
      });

      if (error) {
        console.error("Error rejecting price:", error);
        showToast(`Rejection failed: ${error.message}`, "error");
        return;
      }

      showToast("Winning price was rejected. The auction has ended.", "info");
      setRejectItem(null);
      setRejectionNotes("");
      await fetchListings(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Rejection failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Confirm Handover & Finish Sale
  const handleConfirmHandover = async () => {
    if (!handoverItem) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("complete_handover", {
        p_listing_id: handoverItem.id,
        p_user_id: currentUser.id,
      });

      if (error) {
        console.error("Error confirming handover:", error);
        showToast(`Handover completion failed: ${error.message}`, "error");
        return;
      }

      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Safe fallback
      }

      showToast(`Campus handover confirmed! Sale of "${handoverItem.title}" is officially completed.`, "success");
      setHandoverItem(null);
      await fetchListings(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Handover confirmation failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Cancel Listing (Only when 0 bids placed)
  const handleConfirmCancel = async () => {
    if (!cancelItem) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("listings")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cancelItem.id)
        .eq("seller_id", currentUser.id);

      if (error) {
        console.error("Error cancelling listing:", error);
        showToast(`Cancellation failed: ${error.message}`, "error");
        return;
      }

      showToast(`Listing "${cancelItem.title}" has been cancelled.`, "info");
      setCancelItem(null);
      await fetchListings(true);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Cancellation failed.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Export CSV
  const handleExportCSV = () => {
    if (filteredListings.length === 0) {
      showToast("No listings to export.", "info");
      return;
    }

    const headers = [
      "Title",
      "Category",
      "Condition",
      "Status",
      "Starting Price (₹)",
      "Current/Winning Bid (₹)",
      "Reserve Met",
      "Bids Count",
      "Leading Bidder",
      "Handover Location",
      "Handover Status",
      "Closing Date",
    ];

    const rows = filteredListings.map((l) => [
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.category}"`,
      `"${l.condition}"`,
      `"${l.status}"`,
      l.starting_price,
      l.current_price,
      l.reserve_price > 0 ? (l.current_price >= l.reserve_price ? "Yes" : "No") : "No Reserve",
      l.bids_count,
      `"${l.highest_bidder?.full_name || "None"}"`,
      `"${(l.handover_location || "").replace(/"/g, '""')}"`,
      `"${l.handover_status}"`,
      `"${new Date(l.end_time).toLocaleString()}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `campusbid_seller_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported CSV successfully.", "success");
  };

  // Status badge helper
  const renderStatusBadge = (item: SellerListingItem) => {
    if (item.status === "active") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Active
        </span>
      );
    }
    if (item.status === "pending_approval") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          Awaiting Approval
        </span>
      );
    }
    if (item.status === "sold") {
      if (item.handover_status === "completed") {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
            Sold & Handed Over
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          Handover Pending
        </span>
      );
    }
    if (item.status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          Price Rejected
        </span>
      );
    }
    if (item.status === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        Unsold
      </span>
    );
  };

  // Live Countdown Text helper
  const formatCountdown = (item: SellerListingItem) => {
    if (item.status !== "active") {
      if (item.status === "pending_approval") return "Auction Ended";
      if (item.status === "sold") return "Sale Closed";
      if (item.status === "cancelled") return "Listing Cancelled";
      return "Ended (No Sale)";
    }

    const end = new Date(item.end_time).getTime();
    const diff = end - currentTime;

    if (diff <= 0) {
      return "Closing Now...";
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
    return `${seconds}s`;
  };

  const isUrgentActive = (item: SellerListingItem) => {
    if (item.status !== "active") return false;
    const diff = new Date(item.end_time).getTime() - currentTime;
    return diff > 0 && diff < 30 * 60 * 1000;
  };

  // Check if current user is Rahul or Priya or a buyer
  const isSellerProfile = currentUser.role === "seller";

  return (
    <div className="w-full min-h-screen bg-slate-50 pb-20">
      
      {/* Toast Alert Banner */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium ${
              toast.type === "success"
                ? "bg-white text-emerald-900 border-emerald-200 shadow-emerald-500/5"
                : toast.type === "error"
                ? "bg-white text-rose-900 border-rose-200 shadow-rose-500/5"
                : "bg-white text-slate-900 border-slate-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {toast.type === "info" && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600 ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Demo Seller Switcher Notice (if user is buyer or wants quick seller switch) */}
      <div className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">
              Active Profile: <strong className="text-white">{currentUser.full_name}</strong> ({currentUser.role})
            </span>
            <span className="hidden md:inline text-slate-500">•</span>
            <span className="hidden md:inline text-slate-400">
              {currentUser.hostel_block} (Room {currentUser.room_number})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 hidden sm:inline">Switch seller demo:</span>
            {allStudents.filter((s) => s.role === "seller").map((seller) => (
              <button
                key={seller.id}
                onClick={() => switchUser(seller.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1.5 ${
                  currentUser.id === seller.id
                    ? "bg-red-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                <span>{seller.full_name.split(" ")[0]}</span>
                {currentUser.id === seller.id && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}

            <button
              onClick={() => setViewMode(viewMode === "mine" ? "all" : "mine")}
              className={`ml-2 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${
                viewMode === "all"
                  ? "bg-white text-slate-900 border-white"
                  : "bg-transparent text-slate-300 border-slate-700 hover:border-slate-500"
              }`}
            >
              {viewMode === "all" ? "Showing All Campus Sellers" : "Showing Only My Listings"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Command Center Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header Breadcrumb & Actions Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 tracking-wide uppercase">
              <span>Campus Marketplace</span>
              <span>/</span>
              <span className="text-red-600">Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2.5">
              <span>Seller Command Center</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Oversee live campus auctions, approve provisional winning bids, and complete student handovers.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Refresh button */}
            <button
              onClick={() => fetchListings()}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
              title="Refresh listings and bids"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-red-600" : "text-slate-500"}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Export CSV button */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
              title="Export current table data to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>

            {/* AI Assistant button */}
            {onOpenAiDrawer && (
              <button
                onClick={onOpenAiDrawer}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Ask AI</span>
                <span className="text-[10px] bg-purple-200 text-purple-800 px-1 py-0.5 rounded-sm font-mono">
                  Ctrl /
                </span>
              </button>
            )}

            {/* Primary CTA: List New Item */}
            <button
              onClick={() => triggerCreate && triggerCreate()}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ List New Item</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Cards (4 KPIs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          
          {/* Card 1: Active Listings */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Active Listings
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {metrics.activeCount}
              </span>
              <span className="text-xs font-medium text-emerald-600 flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Live bidding
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Current live value:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(metrics.totalActiveVolume)}
              </span>
            </div>
          </div>

          {/* Card 2: Total Bids Received */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Bids Received
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {metrics.totalBids}
              </span>
              <span className="text-xs font-medium text-indigo-600">
                Total student bids
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Avg per listing:</span>
              <span className="font-semibold text-slate-800">
                {currentSellerListings.length > 0
                  ? (metrics.totalBids / currentSellerListings.length).toFixed(1)
                  : "0.0"} bids
              </span>
            </div>
          </div>

          {/* Card 3: Awaiting Handover & Approval */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Awaiting Action
              </span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                metrics.awaitingCount > 0
                  ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse"
                  : "bg-slate-50 text-slate-400 border-slate-200"
              }`}>
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {metrics.awaitingCount}
              </span>
              {metrics.awaitingCount > 0 ? (
                <span className="text-xs font-semibold text-amber-600">
                  Needs seller action
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-400">
                  All clear
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Approvals / Handovers:</span>
              <span className="font-semibold text-slate-800">
                {metrics.pendingApprovalCount} app / {metrics.handoverPendingCount} hov
              </span>
            </div>
          </div>

          {/* Card 4: Total Sales Volume */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Total Sales Volume
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {formatCurrency(metrics.totalVolume)}
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Handovers completed:</span>
              <span className="font-semibold text-slate-800">
                {metrics.completedCount} items sold
              </span>
            </div>
          </div>

        </div>

        {/* Operational Filter & Command Bar */}
        <div className="mt-8 bg-white rounded-t-xl border border-b-0 border-slate-200 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
              <button
                onClick={() => setStatusTab("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusTab === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>All Listings</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === "all" ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tabCounts.all}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusTab === "active"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Active Bidding</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === "active" ? "bg-emerald-800 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tabCounts.active}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("pending_approval")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusTab === "pending_approval"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Awaiting Approval</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === "pending_approval" ? "bg-amber-800 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tabCounts.pending_approval}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("handover_pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusTab === "handover_pending"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                <span>Handover Pending</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === "handover_pending" ? "bg-blue-800 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tabCounts.handover_pending}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("sold")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusTab === "sold"
                    ? "bg-slate-700 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>Completed</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === "sold" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tabCounts.sold}
                </span>
              </button>

              <button
                onClick={() => setStatusTab("closed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusTab === "closed"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                <span>Unsold / Closed</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  statusTab === "closed" ? "bg-rose-800 text-white" : "bg-slate-200 text-slate-700"
                }`}>
                  {tabCounts.closed}
                </span>
              </button>
            </div>

            {/* Right: Search, Category, Columns Toggle */}
            <div className="flex items-center gap-2.5 flex-wrap">
              
              {/* Search with Ctrl+K shortcut cue */}
              <div className="relative min-w-[220px] sm:min-w-[280px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search item, bidder, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-14 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white text-slate-900 placeholder:text-slate-400 font-medium"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <span className="hidden sm:inline absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded border border-slate-200 font-mono">
                    Ctrl K
                  </span>
                )}
              </div>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="all">All Categories</option>
                <option value="cycle">Cycle</option>
                <option value="calculator">Calculator</option>
                <option value="books">Books</option>
                <option value="electronics">Electronics</option>
                <option value="hostel essentials">Hostel Essentials</option>
              </select>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500"
              >
                <option value="closing_soon">Closing Soonest</option>
                <option value="highest_bid">Highest Bid (₹)</option>
                <option value="most_bids">Most Bids</option>
                <option value="newest">Recently Listed</option>
              </select>

              {/* Columns Menu Toggle */}
              <div className="relative">
                <button
                  onClick={() => setShowColumnsMenu(!showColumnsMenu)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
                  title="Customize table columns"
                >
                  <Columns3 className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Columns</span>
                </button>

                {showColumnsMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowColumnsMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-40 text-xs">
                      <div className="px-3 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                        Toggle Columns
                      </div>
                      <div className="p-1 space-y-0.5">
                        {Object.entries({
                          status: "Status",
                          item: "Item Details",
                          currentBid: "Current Bid",
                          bidsCount: "Bids Count",
                          leadingBidder: "Leading Bidder",
                          countdown: "Time Remaining",
                          handover: "Handover Status",
                          actions: "Actions",
                        }).map(([colKey, label]) => (
                          <label
                            key={colKey}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-50 cursor-pointer font-medium text-slate-700"
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
                              className="rounded border-slate-300 text-red-600 focus:ring-red-500 h-3.5 w-3.5"
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

          {/* Subheader info indicator */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 mt-3 border-t border-slate-100">
            <div>
              Showing <strong className="text-slate-800">{filteredListings.length}</strong> listings
              {viewMode === "all" ? " across campus" : ` for ${currentUser.full_name}`}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
            <div className="text-[11px] text-slate-400 hidden sm:block">
              Realtime synced via Supabase • Anti-Sniping Guard Active
            </div>
          </div>
        </div>

        {/* Operational Data Table matching design/seller dashboard.webp */}
        <div className="bg-white border border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider select-none">
                {visibleColumns.status && (
                  <th scope="col" className="py-3 px-4 w-36">
                    Status
                  </th>
                )}
                {visibleColumns.item && (
                  <th scope="col" className="py-3 px-4 min-w-[260px]">
                    Item
                  </th>
                )}
                {visibleColumns.currentBid && (
                  <th scope="col" className="py-3 px-4 w-36 text-right">
                    Current / Win Bid
                  </th>
                )}
                {visibleColumns.bidsCount && (
                  <th scope="col" className="py-3 px-4 w-28 text-center">
                    Bids
                  </th>
                )}
                {visibleColumns.leadingBidder && (
                  <th scope="col" className="py-3 px-4 min-w-[190px]">
                    Leading Bidder
                  </th>
                )}
                {visibleColumns.countdown && (
                  <th scope="col" className="py-3 px-4 w-36">
                    Time Remaining
                  </th>
                )}
                {visibleColumns.handover && (
                  <th scope="col" className="py-3 px-4 min-w-[180px]">
                    Campus Handover
                  </th>
                )}
                {visibleColumns.actions && (
                  <th scope="col" className="py-3 px-4 text-right min-w-[170px]">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-red-600" />
                      <span className="font-semibold text-xs text-slate-600">Loading campus listings...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedListings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Tag className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        No listings match your filter
                      </div>
                      <p className="text-xs text-slate-500">
                        {searchQuery
                          ? "Try checking your spelling or clear your search query."
                          : statusTab !== "all"
                          ? `There are currently no listings in the "${statusTab.replace("_", " ")}" stage.`
                          : "You have not listed any campus items yet. Put up your first auction!"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Clear Search
                          </button>
                        )}
                        <button
                          onClick={() => triggerCreate && triggerCreate()}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                        >
                          + List An Item
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedListings.map((item) => {
                  const urgent = isUrgentActive(item);
                  const isSellerOfItem = item.seller_id === currentUser.id;
                  const itemThumbnail =
                    item.images && item.images.length > 0
                      ? item.images[0]
                      : "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=400&q=80";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-default"
                    >
                      {/* 1. Status Column */}
                      {visibleColumns.status && (
                        <td className="py-3.5 px-4 align-middle">
                          {renderStatusBadge(item)}
                        </td>
                      )}

                      {/* 2. Item Column (Thumbnail + Title + Category + Handover Location) */}
                      {visibleColumns.item && (
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-3">
                            <img
                              src={itemThumbnail}
                              alt={item.title}
                              className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                onClick={() => onOpenDetailModal && onOpenDetailModal(item.id)}
                                className="font-semibold text-xs sm:text-sm text-slate-900 truncate hover:text-red-600 transition-colors cursor-pointer"
                                title={item.title}
                              >
                                {item.title}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                                <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded">
                                  {item.category}
                                </span>
                                <span>•</span>
                                <span className="text-slate-500">{item.condition}</span>
                                {viewMode === "all" && item.seller && (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-600 font-medium">
                                      By {item.seller.full_name}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* 3. Current / Winning Bid Column */}
                      {visibleColumns.currentBid && (
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="font-black text-sm text-slate-900">
                            {formatCurrency(item.current_price)}
                          </div>
                          <div className="mt-0.5">
                            {item.reserve_price > 0 ? (
                              item.current_price >= item.reserve_price ? (
                                <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Reserve Met
                                </span>
                              ) : (
                                <span className="inline-block text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Reserve {formatCurrency(item.reserve_price)}
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">
                                Base {formatCurrency(item.starting_price)}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* 4. Bid Count Column */}
                      {visibleColumns.bidsCount && (
                        <td className="py-3.5 px-4 align-middle text-center">
                          <button
                            onClick={() => setHistoryItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                            title="Click to view transparent bid audit history"
                          >
                            <Gavel className="w-3 h-3 text-slate-500" />
                            <span>{item.bids_count}</span>
                          </button>
                        </td>
                      )}

                      {/* 5. Leading Bidder / Winner */}
                      {visibleColumns.leadingBidder && (
                        <td className="py-3.5 px-4 align-middle">
                          {item.highest_bidder ? (
                            <div className="flex items-center gap-2.5">
                              <img
                                src={
                                  item.highest_bidder.avatar_url ||
                                  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                                    item.highest_bidder.full_name
                                  )}`
                                }
                                alt={item.highest_bidder.full_name}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-slate-900 truncate">
                                  {item.highest_bidder.full_name}
                                </div>
                                <div className="text-[10px] text-slate-500 truncate">
                                  {item.highest_bidder.hostel_block || "Hostel Student"}
                                  {item.highest_bidder.room_number ? ` • #${item.highest_bidder.room_number}` : ""}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              No bids placed yet
                            </span>
                          )}
                        </td>
                      )}

                      {/* 6. Countdown / Resolution Time */}
                      {visibleColumns.countdown && (
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-1.5">
                            <Clock
                              className={`w-3.5 h-3.5 shrink-0 ${
                                urgent ? "text-red-600 animate-pulse" : "text-slate-400"
                              }`}
                            />
                            <span
                              className={`font-semibold text-xs ${
                                urgent ? "text-red-600 font-bold" : "text-slate-700"
                              }`}
                            >
                              {formatCountdown(item)}
                            </span>
                          </div>
                          {urgent && (
                            <div className="text-[10px] font-bold text-red-600 uppercase tracking-tight mt-0.5">
                              Closing Soon • Anti-Sniping
                            </div>
                          )}
                        </td>
                      )}

                      {/* 7. Handover Location & Status */}
                      {visibleColumns.handover && (
                        <td className="py-3.5 px-4 align-middle">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {item.handover_location || "Campus location pending"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5 capitalize">
                            Handover: {item.handover_status.replace("_", " ")}
                          </div>
                        </td>
                      )}

                      {/* 8. Context-Aware Actions */}
                      {visibleColumns.actions && (
                        <td className="py-3.5 px-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* If pending approval: Approve & Reject buttons */}
                            {item.status === "pending_approval" && (
                              <>
                                <button
                                  onClick={() => {
                                    setApproveItem(item);
                                    setCustomHandoverLocation(item.handover_location || LOCATION_PRESETS[0]);
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-2xs"
                                  title="Approve winning bid and set handover point"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve Price</span>
                                </button>
                                <button
                                  onClick={() => setRejectItem(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
                                  title="Reject winning bid"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* If sold and handover pending: Confirm Handover button */}
                            {item.status === "sold" && item.handover_status !== "completed" && (
                              <button
                                onClick={() => setHandoverItem(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-2xs"
                                title="Confirm physical item handover on campus"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Handover</span>
                              </button>
                            )}

                            {/* If active with 0 bids: Cancel Listing option */}
                            {item.status === "active" && item.bids_count === 0 && (
                              <button
                                onClick={() => setCancelItem(item)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-medium transition-colors"
                                title="Cancel this listing (eligible because 0 bids placed)"
                              >
                                <Ban className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            )}

                            {/* View Details External Link */}
                            <button
                              onClick={() => onOpenDetailModal && onOpenDetailModal(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                              title="View full auction details"
                            >
                              <Eye className="w-4 h-4" />
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

        {/* Bottom Pagination Footer matching design/seller dashboard.webp */}
        <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          
          {/* Left: Summary */}
          <div>
            Showing{" "}
            <strong>
              {filteredListings.length === 0
                ? 0
                : (currentPage - 1) * rowsPerPage + 1}
            </strong>{" "}
            to{" "}
            <strong>
              {Math.min(currentPage * rowsPerPage, filteredListings.length)}
            </strong>{" "}
            of <strong>{filteredListings.length}</strong> items
          </div>

          {/* Center & Right: Rows per page & Navigation */}
          <div className="flex items-center gap-4">
            
            {/* Rows selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Rows:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                className="py-1 px-2 text-xs font-semibold bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-hidden"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Page Count */}
            <div>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </div>

            {/* Page navigation buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* ACTION MODAL 1: Approve Winning Price & Schedule Handover                 */}
      {/* ========================================================================= */}
      {approveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Approve Winning Price
                  </h3>
                  <p className="text-xs text-slate-500">
                    Finalize sale and schedule campus pickup
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApproveItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              
              {/* Item Card */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <img
                  src={approveItem.images[0] || ""}
                  alt={approveItem.title}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 text-xs truncate">
                    {approveItem.title}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Provisional Winning Bid: <strong className="text-emerald-700 font-bold">{formatCurrency(approveItem.current_price)}</strong>
                  </div>
                </div>
              </div>

              {/* Winner Student Details */}
              {approveItem.highest_bidder && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={approveItem.highest_bidder.avatar_url || ""}
                      alt={approveItem.highest_bidder.full_name}
                      className="w-8 h-8 rounded-full border border-blue-200"
                    />
                    <div>
                      <div className="font-bold text-slate-900">
                        {approveItem.highest_bidder.full_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {approveItem.highest_bidder.hostel_block} (Room {approveItem.highest_bidder.room_number})
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    Winner
                  </span>
                </div>
              )}

              {/* Handover Location Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Confirm Campus Handover Location:
                </label>
                <div className="grid grid-cols-1 gap-1.5 mb-2">
                  {LOCATION_PRESETS.map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setCustomHandoverLocation(loc)}
                      className={`px-3 py-1.5 text-left rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                        customHandoverLocation === loc
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="truncate">{loc}</span>
                      {customHandoverLocation === loc && <Check className="w-3.5 h-3.5 text-white shrink-0 ml-2" />}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Or enter specific spot (e.g., Hostel 3 Porch at 5 PM)"
                  value={customHandoverLocation}
                  onChange={(e) => setCustomHandoverLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 font-medium"
                />
              </div>

              {/* Handover Notes for buyer */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Optional Note for Winning Student:
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., I'll bring the helmet and chain lock with me."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900"
                />
              </div>

            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApproveItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Approval & Schedule Handover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION MODAL 2: Reject Winning Price                                      */}
      {/* ========================================================================= */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                  <X className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Reject Winning Price
                  </h3>
                  <p className="text-xs text-slate-500">
                    Decline provisional price of {formatCurrency(rejectItem.current_price)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Rejecting will cancel the provisional winning offer. The bidder will be notified and the item will be marked as rejected (eligible for relisting).
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reason / Seller Note (Optional):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g., Below expected valuation, will relist next semester."
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION MODAL 3: Confirm Handover & Finish Sale                            */}
      {/* ========================================================================= */}
      {handoverItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Campus Handover
                  </h3>
                  <p className="text-xs text-slate-500">
                    Officially finish item exchange and close transaction
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHandoverItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 text-xs">
                  {handoverItem.title}
                </div>
                <div className="text-slate-500 mt-1 flex items-center justify-between">
                  <span>Agreed Sale Value:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(handoverItem.current_price)}
                  </span>
                </div>
                <div className="text-slate-500 mt-1 flex items-center justify-between">
                  <span>Pickup Location:</span>
                  <span className="font-semibold text-slate-800">
                    {handoverItem.handover_location || "Campus Porch"}
                  </span>
                </div>
              </div>

              {handoverItem.highest_bidder && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-3">
                  <img
                    src={handoverItem.highest_bidder.avatar_url || ""}
                    alt={handoverItem.highest_bidder.full_name}
                    className="w-9 h-9 rounded-full border border-emerald-200 shrink-0"
                  />
                  <div>
                    <div className="font-bold text-slate-900">
                      Buyer: {handoverItem.highest_bidder.full_name}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {handoverItem.highest_bidder.hostel_block} • Room {handoverItem.highest_bidder.room_number}
                    </div>
                    {handoverItem.highest_bidder.phone_number && (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Phone: {handoverItem.highest_bidder.phone_number}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-[11px] leading-relaxed">
                Please verify that you have physically met the student, transferred the item in described condition, and received payment before confirming.
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHandoverItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmHandover}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm Handover & Finish Sale</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTION MODAL 4: Cancel Listing (When 0 Bids)                              */}
      {/* ========================================================================= */}
      {cancelItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cancel Listing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Withdraw active auction with 0 bids
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel the auction for <strong className="text-slate-900">"{cancelItem.title}"</strong>? Because no bids have been placed, it will be safely removed from campus listings immediately.
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
              >
                Keep Active
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Cancel Listing</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: Transparent Bid History Modal                                    */}
      {/* ========================================================================= */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Gavel className="w-5 h-5 text-slate-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Transparent Bid History
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs">
                    {historyItem.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <span>Bidder</span>
                <span>Amount & Type</span>
                <span>Time</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto mt-1 pr-1">
                {(!historyItem.bids || historyItem.bids.length === 0) ? (
                  <div className="py-8 text-center text-slate-400">
                    No bids recorded for this listing yet.
                  </div>
                ) : (
                  historyItem.bids.map((b, idx) => (
                    <div key={b.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-4 text-slate-400 font-mono text-[10px]">
                          #{historyItem.bids!.length - idx}
                        </span>
                        <img
                          src={
                            b.bidder?.avatar_url ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                              b.bidder?.full_name || "Student"
                            )}`
                          }
                          alt=""
                          className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate">
                            {b.bidder?.full_name || "Campus Student"}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {b.bidder?.hostel_block || "Campus Hostel"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-xs">
                          {formatCurrency(b.amount)}
                        </div>
                        {b.is_proxy_bid && (
                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 py-0.2 rounded border border-purple-200">
                            Auto Proxy
                          </span>
                        )}
                      </div>

                      <div className="text-right text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {new Date(b.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setHistoryItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
