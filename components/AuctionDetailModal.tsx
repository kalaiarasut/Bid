"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Clock,
  MapPin,
  Gavel,
  User,
  Star,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  MessageSquare,
  Send,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Info,
  Calendar,
  Check,
  RefreshCw,
  Building2,
  Zap,
  Bot,
  HelpCircle,
  Tag,
  DollarSign,
  Ban,
  Edit,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabase";
import { useUser } from "./UserContext";
import { formatCurrency } from "@/lib/utils";
import { Tables } from "@/types/database.types";

export interface AuctionDetailModalProps {
  isOpen?: boolean;
  listingId: string | null;
  initialListing?: any;
  onClose: () => void;
  onBidSuccess?: () => void;
  onListingUpdated?: (listing: any) => void;
}

export interface BidRecord {
  id: string;
  amount: number;
  bidder_id: string;
  is_proxy_bid: boolean;
  created_at: string;
  bidder_name?: string;
  bidder_avatar?: string;
  bidder_hostel?: string;
  bidder_room?: string;
}

export interface QuestionRecord {
  id: string;
  user_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  asker_name?: string;
  asker_avatar?: string;
  asker_hostel?: string;
}

// Format relative time: e.g. "2m ago"
function getRelativeTime(dateString: string): string {
  try {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateString;
  }
}

// Format exact time: e.g. "10:45 AM, 28 Oct"
function getExactTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateString;
  }
}

export function AuctionDetailModal({
  isOpen = true,
  listingId,
  initialListing,
  onClose,
  onBidSuccess,
  onListingUpdated,
}: AuctionDetailModalProps) {
  const { currentUser } = useUser();

  const [listing, setListing] = useState<any>(initialListing || null);
  const [seller, setSeller] = useState<any>(null);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialListing);

  // Gallery state
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);

  // Bidding state
  const [bidAmount, setBidAmount] = useState<string>("");
  const [isProxyEnabled, setIsProxyEnabled] = useState<boolean>(false);
  const [maxProxyAmount, setMaxProxyAmount] = useState<string>("");
  const [biddingSubmitting, setBiddingSubmitting] = useState<boolean>(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccessMsg, setBidSuccessMsg] = useState<string | null>(null);

  // Q&A state
  const [newQuestion, setNewQuestion] = useState<string>("");
  const [replyText, setReplyText] = useState<{ [qId: string]: string }>({});
  const [qaSubmitting, setQaSubmitting] = useState<boolean>(false);
  const [qaFeedback, setQaFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Real-time Countdown & Anti-sniping state
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isEnded: boolean;
    isUnder5Minutes: boolean;
    isUnder30Seconds: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isEnded: false,
    isUnder5Minutes: false,
    isUnder30Seconds: false,
  });

  const [antiSnipingNotice, setAntiSnipingNotice] = useState<string | null>(null);
  const prevEndTimeRef = useRef<string | null>(initialListing?.end_time || null);

  // Seller Action state
  const [resolvingAuction, setResolvingAuction] = useState<boolean>(false);
  const [sellerHandoverLocation, setSellerHandoverLocation] = useState<string>("");
  const [sellerNotesInput, setSellerNotesInput] = useState<string>("");
  const [sellerActionMsg, setSellerActionMsg] = useState<{ type: "success" | "info" | "error"; text: string } | null>(null);

  // 1. Fetch full listing data & join tables
  const fetchListingData = useCallback(async () => {
    if (!listingId) return;

    try {
      // 1. Fetch listing
      const { data: listingData, error: listingErr } = await supabase
        .from("listings")
        .select("*")
        .eq("id", listingId)
        .single();

      if (listingErr || !listingData) {
        console.error("Error fetching listing:", listingErr);
        return;
      }

      // Check anti-sniping dynamic extension (when end_time pushed forward)
      if (prevEndTimeRef.current && prevEndTimeRef.current !== listingData.end_time) {
        const oldEnd = new Date(prevEndTimeRef.current).getTime();
        const newEnd = new Date(listingData.end_time).getTime();
        if (newEnd > oldEnd) {
          const extensionSecs = Math.round((newEnd - oldEnd) / 1000);
          setAntiSnipingNotice(`⚡ Anti-sniping activated! Closing extended by ${extensionSecs}s`);
          setTimeout(() => setAntiSnipingNotice(null), 10000);
        }
      }
      prevEndTimeRef.current = listingData.end_time;

      setListing(listingData);
      setSellerHandoverLocation(listingData.handover_location || "");
      if (onListingUpdated) onListingUpdated(listingData);

      // Default bid input to minimum required bid
      const currentPriceNum = Number(listingData.current_price);
      const minIncNum = Number(listingData.min_bid_increment || 50);
      const minValid = currentPriceNum + minIncNum;
      setBidAmount(minValid.toString());
      setMaxProxyAmount((minValid + minIncNum * 4).toString());

      // 2. Fetch seller profile
      const { data: sellerData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", listingData.seller_id)
        .single();
      if (sellerData) setSeller(sellerData);

      // 3. Fetch bids with bidder profiles
      const { data: bidsData } = await supabase
        .from("bids")
        .select(`
          id,
          amount,
          bidder_id,
          is_proxy_bid,
          created_at,
          profiles:bidder_id (
            full_name,
            avatar_url,
            hostel_block,
            room_number
          )
        `)
        .eq("listing_id", listingId)
        .order("created_at", { ascending: false });

      if (bidsData) {
        const formattedBids: BidRecord[] = bidsData.map((b: any) => ({
          id: b.id,
          amount: Number(b.amount),
          bidder_id: b.bidder_id,
          is_proxy_bid: Boolean(b.is_proxy_bid),
          created_at: b.created_at,
          bidder_name: b.profiles?.full_name || "Campus Student",
          bidder_avatar: b.profiles?.avatar_url,
          bidder_hostel: b.profiles?.hostel_block,
          bidder_room: b.profiles?.room_number,
        }));
        setBids(formattedBids);
      }

      // 4. Fetch questions
      const { data: questionsData } = await supabase
        .from("questions")
        .select(`
          id,
          user_id,
          question,
          answer,
          answered_at,
          created_at,
          profiles:user_id (
            full_name,
            avatar_url,
            hostel_block
          )
        `)
        .eq("listing_id", listingId)
        .order("created_at", { ascending: true });

      if (questionsData) {
        const formattedQ: QuestionRecord[] = questionsData.map((q: any) => ({
          id: q.id,
          user_id: q.user_id,
          question: q.question,
          answer: q.answer,
          answered_at: q.answered_at,
          created_at: q.created_at,
          asker_name: q.profiles?.full_name || "Campus Student",
          asker_avatar: q.profiles?.avatar_url,
          asker_hostel: q.profiles?.hostel_block,
        }));
        setQuestions(formattedQ);
      }
    } catch (err) {
      console.error("fetchListingData error:", err);
    } finally {
      setLoading(false);
    }
  }, [listingId, onListingUpdated]);

  // Initial load
  useEffect(() => {
    if (listingId && isOpen) {
      fetchListingData();
    }
  }, [listingId, isOpen, fetchListingData]);

  // 2. Realtime Subscriptions for listing, bids, and questions
  useEffect(() => {
    if (!listingId || !isOpen) return;

    const channel = supabase
      .channel(`modal-realtime-${listingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "listings",
          filter: `id=eq.${listingId}`,
        },
        () => {
          fetchListingData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bids",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          fetchListingData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "questions",
          filter: `listing_id=eq.${listingId}`,
        },
        () => {
          fetchListingData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId, isOpen, fetchListingData]);

  // 3. Real-time Countdown Timer (every 1 second)
  useEffect(() => {
    if (!listing?.end_time || !isOpen) return;

    const updateTimer = () => {
      const diff = new Date(listing.end_time).getTime() - Date.now();
      if (diff <= 0 || listing.status !== "active") {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isEnded: true,
          isUnder5Minutes: false,
          isUnder30Seconds: false,
        });
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const days = Math.floor(totalSec / 86400);
      const hours = Math.floor((totalSec % 86400) / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds: totalSec,
        isEnded: false,
        isUnder5Minutes: totalSec < 300,
        isUnder30Seconds: totalSec < 30,
      });
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [listing?.end_time, listing?.status, isOpen]);

  // Keyboard escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !listingId) return null;

  // Normalized values
  const currentPrice = Number(listing?.current_price ?? 0);
  const minIncrement = Number(listing?.min_bid_increment ?? 50);
  const minNextBid = currentPrice + minIncrement;
  const isSeller = Boolean(currentUser?.id && listing?.seller_id && currentUser.id === listing.seller_id);
  const isLeading = Boolean(currentUser?.id && listing?.highest_bidder_id && currentUser.id === listing.highest_bidder_id);

  const imagesList = listing?.images && listing.images.length > 0
    ? listing.images
    : ["https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80"];

  // 4. Place Bid Atomic RPC Call
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setBidError(null);
    setBidSuccessMsg(null);

    if (isSeller) {
      setBidError("Sellers cannot place bids on their own listings.");
      return;
    }

    if (timeLeft.isEnded || listing.status !== "active") {
      setBidError("This auction has ended. No more bids are accepted.");
      return;
    }

    const amountNum = parseFloat(bidAmount);
    if (isNaN(amountNum) || amountNum < minNextBid) {
      setBidError(`Bid amount must be at least ₹${minNextBid.toLocaleString()} (Current: ₹${currentPrice.toLocaleString()} + Min Inc: ₹${minIncrement}).`);
      return;
    }

    let proxyCeilingNum: number | null = null;
    if (isProxyEnabled) {
      const parsedProxy = parseFloat(maxProxyAmount);
      if (isNaN(parsedProxy) || parsedProxy < amountNum) {
        setBidError("Proxy maximum ceiling cannot be less than your bid amount.");
        return;
      }
      proxyCeilingNum = parsedProxy;
    }

    setBiddingSubmitting(true);

    try {
      const { data, error } = await supabase.rpc("place_bid_atomic", {
        p_listing_id: listing.id,
        p_bidder_id: currentUser.id,
        p_amount: amountNum,
        p_max_proxy_amount: isProxyEnabled ? proxyCeilingNum : null,
      });

      if (error) {
        throw error;
      }

      const res: any = data;
      if (res && res.success) {
        // Trigger confetti explosion on successful bid!
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#dc2626", "#ea580c", "#16a34a", "#2563eb", "#f59e0b"],
          });
        } catch (confettiErr) {
          console.error("Confetti trigger error:", confettiErr);
        }

        if (res.sniping_extended) {
          setAntiSnipingNotice("⚡ Anti-sniping activated! Closing extended by 60s");
        }

        setBidSuccessMsg(
          res.message ||
            (isProxyEnabled
              ? `🎉 Leading bid of ₹${amountNum.toLocaleString()} placed! Proxy ceiling set to ₹${proxyCeilingNum?.toLocaleString()}.`
              : `🎉 Leading bid of ₹${amountNum.toLocaleString()} placed! You are currently the highest bidder.`)
        );

        await fetchListingData();
        if (onBidSuccess) onBidSuccess();
      } else {
        setBidError(res?.error || "Bid could not be accepted. Please try a higher increment.");
      }
    } catch (err: any) {
      console.error("Bid RPC error:", err);
      setBidError(err.message || "Failed to place bid. Please check your network and try again.");
    } finally {
      setBiddingSubmitting(false);
    }
  };

  // Quick increment buttons: +₹50, +₹100, +₹250
  const handleQuickIncrement = (increment: number) => {
    const nextAmount = minNextBid + increment;
    setBidAmount(nextAmount.toString());
    if (isProxyEnabled && parseFloat(maxProxyAmount) < nextAmount) {
      setMaxProxyAmount((nextAmount + minIncrement * 4).toString());
    }
  };

  // 5. Questions (Q&A) Handlers
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    setQaSubmitting(true);
    setQaFeedback(null);

    try {
      const { error } = await supabase.from("questions").insert({
        listing_id: listing.id,
        user_id: currentUser.id,
        question: newQuestion.trim(),
      });

      if (error) throw error;

      setNewQuestion("");
      setQaFeedback({ type: "success", message: "Question posted! The seller will be notified to answer." });
      await fetchListingData();
    } catch (err: any) {
      setQaFeedback({ type: "error", message: err.message || "Failed to post question." });
    } finally {
      setQaSubmitting(false);
    }
  };

  const handleReplyQuestion = async (qId: string) => {
    const reply = replyText[qId];
    if (!reply || !reply.trim() || !isSeller) return;

    try {
      const { error } = await supabase
        .from("questions")
        .update({
          answer: reply.trim(),
          answered_at: new Date().toISOString(),
        })
        .eq("id", qId);

      if (error) throw error;

      setReplyText((prev) => ({ ...prev, [qId]: "" }));
      await fetchListingData();
    } catch (err) {
      console.error("handleReplyQuestion error:", err);
    }
  };

  // 6. Seller Resolution & Handover Controls
  const handleSellerResolve = async (approve: boolean) => {
    setResolvingAuction(true);
    setSellerActionMsg(null);

    try {
      const { error } = await supabase.rpc("seller_resolve_auction", {
        p_listing_id: listing.id,
        p_seller_id: currentUser.id,
        p_approve: approve,
        p_handover_location: sellerHandoverLocation || listing.handover_location || "Campus Porch",
        p_notes: sellerNotesInput || (approve ? "Winning bid approved by seller." : "Declined by seller."),
      });

      if (error) throw error;

      if (approve) {
        try {
          confetti({ particleCount: 75, spread: 65, origin: { y: 0.6 } });
        } catch {}
        setSellerActionMsg({
          type: "success",
          text: `Winning bid of ${formatCurrency(currentPrice)} approved! Handover is now scheduled.`,
        });
      } else {
        setSellerActionMsg({
          type: "info",
          text: "Winning bid rejected. Listing status updated.",
        });
      }

      await fetchListingData();
      if (onBidSuccess) onBidSuccess();
    } catch (err: any) {
      setSellerActionMsg({ type: "error", text: err.message || "Failed to resolve auction." });
    } finally {
      setResolvingAuction(false);
    }
  };

  const handleCompleteHandover = async () => {
    setResolvingAuction(true);
    setSellerActionMsg(null);

    try {
      const { error } = await supabase.rpc("complete_handover", {
        p_listing_id: listing.id,
        p_user_id: currentUser.id,
      });

      if (error) throw error;

      try {
        confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
      } catch {}

      setSellerActionMsg({
        type: "success",
        text: "Campus handover confirmed! Transaction successfully completed.",
      });

      await fetchListingData();
      if (onBidSuccess) onBidSuccess();
    } catch (err: any) {
      setSellerActionMsg({ type: "error", text: err.message || "Failed to confirm handover." });
    } finally {
      setResolvingAuction(false);
    }
  };

  const handleCancelListing = async () => {
    if (!confirm("Are you sure you want to cancel this listing? This action cannot be undone.")) {
      return;
    }

    setResolvingAuction(true);
    setSellerActionMsg(null);

    try {
      const { error } = await supabase
        .from("listings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", listing.id);

      if (error) throw error;

      setSellerActionMsg({ type: "info", text: "Listing cancelled successfully." });
      await fetchListingData();
    } catch (err: any) {
      setSellerActionMsg({ type: "error", text: err.message || "Failed to cancel listing." });
    } finally {
      setResolvingAuction(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col z-10"
      >
        {/* Anti-Sniping Dynamic Notification Banner */}
        {antiSnipingNotice && (
          <div className="bg-amber-500 text-slate-950 px-4 py-2.5 text-xs sm:text-sm font-black flex items-center justify-between border-b border-amber-600 shadow-inner animate-pulse shrink-0">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 fill-slate-950 text-slate-950 shrink-0" />
              <span>{antiSnipingNotice}</span>
            </div>
            <button
              onClick={() => setAntiSnipingNotice(null)}
              className="p-1 hover:bg-amber-600 rounded text-slate-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 uppercase tracking-wider">
              {listing?.category || "Item"}
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
              {listing?.handover_location || "On-Campus Handover"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isSeller && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">
                Your Listing
              </span>
            )}
            {isLeading && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3" /> Winning
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1">
          {loading && !listing ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <div className="text-xs font-semibold text-slate-500">
                Syncing live auction state...
              </div>
            </div>
          ) : (
            <>
              {/* Top Two-Column Grid: Left Gallery + Seller, Right Console */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Column: Image Gallery & Seller Info (5 Cols) */}
                <div className="md:col-span-5 space-y-4">
                  {/* Main Gallery Display */}
                  <div className="relative aspect-4/3 w-full rounded-xl bg-slate-100 overflow-hidden border border-slate-200 shadow-2xs group">
                    <img
                      src={imagesList[Math.min(activeImageIdx, imagesList.length - 1)]}
                      alt={listing?.title || "Item"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                    />

                    {/* Condition Badge */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/95 text-slate-800 shadow-xs border border-slate-200 backdrop-blur-xs">
                        {listing?.condition || "Good"}
                      </span>
                    </div>

                    {/* Anti-Sniping Pill */}
                    <div className="absolute bottom-2.5 left-2.5 z-10">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/90 text-slate-950 shadow-xs flex items-center gap-1 backdrop-blur-xs">
                        <Zap className="w-3 h-3 fill-slate-950" />
                        Anti-Sniping Active
                      </span>
                    </div>

                    {/* Arrows if multiple images */}
                    {imagesList.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIdx((prev) => (prev > 0 ? prev - 1 : imagesList.length - 1));
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIdx((prev) => (prev < imagesList.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Strip */}
                  {imagesList.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {imagesList.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActiveImageIdx(idx)}
                          className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                            idx === activeImageIdx
                              ? "border-red-600 ring-2 ring-red-100"
                              : "border-slate-200 opacity-70 hover:opacity-100"
                          }`}
                        >
                          <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Seller Profile Card */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Campus Seller Info</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={
                          seller?.avatar_url ||
                          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                            seller?.full_name || "Senior Seller"
                          )}`
                        }
                        alt="Seller"
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0 bg-white"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {seller?.full_name || "Campus Senior"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {seller?.hostel_block || "Campus Hostel"} • Room {seller?.room_number || "—"}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 mt-0.5">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>{Number(seller?.rating || 4.9).toFixed(1)}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({seller?.total_ratings || 12} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hostel Handover Location Card */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5 text-xs text-slate-700">
                    <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Campus Handover Spot</div>
                      <div className="text-slate-600 mt-0.5">{listing?.handover_location || "Campus security gate"}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        In-person physical verification before handover completion.
                      </div>
                    </div>
                  </div>

                  {/* Description Box */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Description
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                      {listing?.description || "No description provided."}
                    </p>
                  </div>
                </div>

                {/* Right Column: Timer, Stats & Bid Console (7 Cols) */}
                <div className="md:col-span-7 space-y-4">
                  {/* Title & Starting Stats */}
                  <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
                      {listing?.title}
                    </h1>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Starting Price: {formatCurrency(listing?.starting_price || 0)}</span>
                      <span>•</span>
                      <span>Min Increment: +{formatCurrency(minIncrement)}</span>
                    </div>
                  </div>

                  {/* Real-time Countdown Timer with Dynamic Highlighting */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all ${
                      timeLeft.isEnded
                        ? "bg-slate-100 border-slate-300 text-slate-700"
                        : timeLeft.isUnder30Seconds
                        ? "bg-red-600 text-white border-red-700 shadow-md animate-pulse"
                        : timeLeft.isUnder5Minutes
                        ? "bg-red-50 border-red-300 text-red-900 shadow-xs animate-pulse"
                        : "bg-slate-900 text-white border-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider">
                        <Clock className={`w-4 h-4 ${timeLeft.isUnder30Seconds ? "animate-spin" : ""}`} />
                        <span>
                          {timeLeft.isEnded
                            ? "Auction Closed"
                            : timeLeft.isUnder30Seconds
                            ? "⚡ FINAL 30 SECONDS! (CLOSING IMMINENT)"
                            : timeLeft.isUnder5Minutes
                            ? "CLOSING SOON (< 5 MINUTES)"
                            : "Live Closing Countdown"}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-80">
                        {timeLeft.isEnded ? "Bidding Ended" : "Any bid under 30s extends by 60s"}
                      </span>
                    </div>

                    {/* Countdown Digits Display */}
                    {!timeLeft.isEnded ? (
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="bg-black/20 p-2 rounded-lg backdrop-blur-xs">
                          <div className="text-xl font-black">{timeLeft.days}</div>
                          <div className="text-[9px] uppercase tracking-wider opacity-75">Days</div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg backdrop-blur-xs">
                          <div className="text-xl font-black">
                            {timeLeft.hours.toString().padStart(2, "0")}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-75">Hours</div>
                        </div>
                        <div className="bg-black/20 p-2 rounded-lg backdrop-blur-xs">
                          <div className="text-xl font-black">
                            {timeLeft.minutes.toString().padStart(2, "0")}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-75">Mins</div>
                        </div>
                        <div
                          className={`p-2 rounded-lg backdrop-blur-xs ${
                            timeLeft.isUnder30Seconds ? "bg-white text-red-700 font-extrabold" : "bg-black/20"
                          }`}
                        >
                          <div className="text-xl font-black">
                            {timeLeft.seconds.toString().padStart(2, "0")}
                          </div>
                          <div className="text-[9px] uppercase tracking-wider opacity-75">Secs</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-xs font-bold">
                        {listing?.status === "sold" ? "Item Sold" : "Auction has ended."}
                      </div>
                    )}
                  </div>

                  {/* Current Leading Bid, Minimum Bid Increment, and Minimum Next Bid */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Current Leading
                      </div>
                      <div className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
                        {formatCurrency(currentPrice)}
                      </div>
                      {isLeading && (
                        <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                          ✓ You are leading
                        </div>
                      )}
                    </div>

                    <div className="border-x border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Min Increment
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-slate-700 tracking-tight mt-0.5">
                        +{formatCurrency(minIncrement)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Fixed step</div>
                    </div>

                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Min Next Bid
                      </div>
                      <div className="text-lg sm:text-xl font-black text-red-600 tracking-tight mt-0.5">
                        {formatCurrency(minNextBid)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Required minimum</div>
                    </div>
                  </div>

                  {/* Real-time Bid Console */}
                  {!timeLeft.isEnded && listing?.status === "active" && !isSeller && (
                    <form
                      onSubmit={handlePlaceBid}
                      className="p-4 rounded-xl bg-white border-2 border-red-100 shadow-xs space-y-3.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <Gavel className="w-4 h-4 text-red-600" />
                          <span>Place Real-Time Bid</span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Atomic &amp; Verified
                        </span>
                      </div>

                      {/* Bid Feedback Alerts */}
                      {bidError && (
                        <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-2 border border-red-200">
                          <AlertTriangle className="w-4 h-4 shrink-0" />
                          <span>{bidError}</span>
                        </div>
                      )}
                      {bidSuccessMsg && (
                        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{bidSuccessMsg}</span>
                        </div>
                      )}

                      {/* Quick Increment Buttons: +₹50, +₹100, +₹250 */}
                      <div>
                        <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                          Quick increment buttons (set bid amount):
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickIncrement(50)}
                            className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                          >
                            +₹50 ({formatCurrency(minNextBid + 50)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickIncrement(100)}
                            className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                          >
                            +₹100 ({formatCurrency(minNextBid + 100)})
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickIncrement(250)}
                            className="py-1.5 px-2 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors"
                          >
                            +₹250 ({formatCurrency(minNextBid + 250)})
                          </button>
                        </div>
                      </div>

                      {/* Custom Bid Amount Input */}
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                          Custom Bid Amount (₹)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                            ₹
                          </span>
                          <input
                            type="number"
                            required
                            min={minNextBid}
                            step={minIncrement}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-base font-black bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Minimum required bid: {formatCurrency(minNextBid)}.
                        </p>
                      </div>

                      {/* Automatic Proxy Bidding Section */}
                      <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isProxyEnabled}
                            onChange={(e) => setIsProxyEnabled(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 accent-purple-600"
                          />
                          <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                            <Bot className="w-3.5 h-3.5 text-purple-700" />
                            Enable Automatic Proxy Bidding
                          </span>
                        </label>

                        {/* Explanation Text */}
                        <p className="text-[11px] text-purple-900/80 leading-relaxed">
                          The system will automatically bid for you in minimum increments up to this maximum only as needed to keep you in the lead.
                        </p>

                        {isProxyEnabled && (
                          <div className="pt-2 border-t border-purple-200/60 space-y-1.5 animate-in fade-in duration-150">
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900">
                              Maximum Bid Ceiling (₹)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400 font-bold text-xs">
                                ₹
                              </span>
                              <input
                                type="number"
                                min={bidAmount || minNextBid}
                                step={minIncrement}
                                value={maxProxyAmount}
                                onChange={(e) => setMaxProxyAmount(e.target.value)}
                                placeholder="e.g. 4500"
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-purple-300 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-purple-500 font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Place Bid Button */}
                      <button
                        type="submit"
                        disabled={biddingSubmitting}
                        className="w-full py-2.5 px-4 rounded-xl text-sm font-black text-white bg-red-600 hover:bg-red-700 shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Gavel className="w-4 h-4" />
                        <span>
                          {biddingSubmitting
                            ? "Placing Atomic Bid..."
                            : `Place Bid of ${formatCurrency(parseFloat(bidAmount) || minNextBid)}`}
                        </span>
                      </button>
                    </form>
                  )}

                  {/* Seller Resolution & Handover Controls Panel */}
                  {isSeller && (
                    <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 space-y-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-indigo-600" />
                          Seller Resolution &amp; Handover Controls
                        </span>
                        <span className="text-[10px] font-semibold text-indigo-600 uppercase">
                          Status: {listing?.status}
                        </span>
                      </div>

                      {sellerActionMsg && (
                        <div
                          className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                            sellerActionMsg.type === "success"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : sellerActionMsg.type === "info"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-red-50 text-red-800 border border-red-200"
                          }`}
                        >
                          <span>{sellerActionMsg.text}</span>
                          <button onClick={() => setSellerActionMsg(null)}>✕</button>
                        </div>
                      )}

                      {/* 1. Pending Approval: Approve Winning Bid (₹X) and Reject Bid */}
                      {(listing?.status === "pending_approval" || (timeLeft.isEnded && listing?.status === "active" && bids.length > 0)) && (
                        <div className="space-y-3 pt-1">
                          <p className="text-xs text-indigo-900 leading-relaxed">
                            The auction has ended with a leading bid of{" "}
                            <strong>{formatCurrency(currentPrice)}</strong>.
                          </p>

                          <div className="space-y-2">
                            <input
                              type="text"
                              value={sellerHandoverLocation}
                              onChange={(e) => setSellerHandoverLocation(e.target.value)}
                              placeholder="Confirm Handover Location (e.g. Hostel 3 Mess Porch)"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-900"
                            />
                            <input
                              type="text"
                              value={sellerNotesInput}
                              onChange={(e) => setSellerNotesInput(e.target.value)}
                              placeholder="Instructions for buyer (optional)"
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-slate-900"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSellerResolve(true)}
                              disabled={resolvingAuction}
                              className="flex-1 py-2 px-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve Winning Bid ({formatCurrency(currentPrice)})</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSellerResolve(false)}
                              disabled={resolvingAuction}
                              className="py-2 px-3 text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
                            >
                              Reject Bid
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 2. Sold or Handover Pending: Confirm Campus Handover */}
                      {(listing?.status === "sold" || listing?.handover_status === "pending" || listing?.handover_status === "scheduled") && (
                        <div className="space-y-2 pt-1">
                          <div className="text-xs text-indigo-900">
                            Campus handover scheduled at: <strong>{listing?.handover_location || sellerHandoverLocation}</strong>
                          </div>
                          <button
                            type="button"
                            onClick={handleCompleteHandover}
                            disabled={resolvingAuction || listing?.handover_status === "completed"}
                            className="w-full py-2.5 px-3 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {listing?.handover_status === "completed"
                                ? "Handover Completed & Verified!"
                                : "Confirm Campus Handover"}
                            </span>
                          </button>
                        </div>
                      )}

                      {/* 3. Active and 0 Bids: Edit Listing / Cancel Listing */}
                      {listing?.status === "active" && bids.length === 0 && (
                        <div className="space-y-2 pt-1">
                          <p className="text-xs text-indigo-900">
                            No bids have been placed yet on this listing.
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleCancelListing}
                              disabled={resolvingAuction}
                              className="py-1.5 px-3 rounded-lg text-xs font-bold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-colors flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Cancel Listing</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Public Transparent Bid History Table */}
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Public Transparent Bid History ({bids.length})
                      </div>
                      <span className="text-[10px] text-slate-400">Public &amp; Verified</span>
                    </div>

                    {bids.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No bids placed yet. Be the first to bid!
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="py-2 px-3">Bidder Name</th>
                              <th className="py-2 px-3">Amount (₹)</th>
                              <th className="py-2 px-3">Type</th>
                              <th className="py-2 px-3 text-right">Time (Relative &amp; Exact)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {bids.map((b, idx) => (
                              <tr
                                key={b.id}
                                className={idx === 0 ? "bg-emerald-50/50 font-bold" : "hover:bg-slate-50"}
                              >
                                <td className="py-2 px-3 text-slate-900">
                                  <div className="flex items-center gap-1.5">
                                    {idx === 0 && (
                                      <span className="text-emerald-700 font-bold text-[10px]">👑</span>
                                    )}
                                    <span className="truncate max-w-[130px]">{b.bidder_name}</span>
                                    {currentUser.id === b.bidder_id && (
                                      <span className="px-1 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-black uppercase">
                                        You
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-black text-slate-900">
                                  {formatCurrency(b.amount)}
                                </td>
                                <td className="py-2 px-3">
                                  {b.is_proxy_bid ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-purple-100 text-purple-700 text-[9px] font-bold">
                                      <Bot className="w-2.5 h-2.5" /> Auto-bid
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-500 text-[10px]">
                                      <User className="w-2.5 h-2.5" /> Manual
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-right text-slate-500 text-[10px]">
                                  <span className="font-semibold text-slate-700">{getRelativeTime(b.created_at)}</span>{" "}
                                  <span className="text-slate-400">({getExactTime(b.created_at)})</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </div>

              {/* Questions Before Bidding (Item Q&A Section) */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-700" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Questions Before Bidding ({questions.length})
                    </h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Ask condition questions publicly before bidding
                  </span>
                </div>

                {qaFeedback && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-semibold flex items-center justify-between ${
                      qaFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-red-50 text-red-800 border border-red-200"
                    }`}
                  >
                    <span>{qaFeedback.message}</span>
                    <button onClick={() => setQaFeedback(null)}>✕</button>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No questions asked yet. Ask about accessories, condition, battery health, or test rides!
                    </div>
                  ) : (
                    questions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
                      >
                        {/* Question */}
                        <div className="flex items-start gap-2">
                          <span className="font-black text-slate-400 shrink-0">Q:</span>
                          <div className="flex-1">
                            <span className="font-semibold text-slate-900">{q.question}</span>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Asked by {q.asker_name} • {getRelativeTime(q.created_at)} ({getExactTime(q.created_at)})
                            </div>
                          </div>
                        </div>

                        {/* Seller Answer */}
                        {q.answer ? (
                          <div className="flex items-start gap-2 pl-4 border-l-2 border-red-500 bg-red-50/50 p-2 rounded-r-lg">
                            <span className="font-black text-red-600 shrink-0">A:</span>
                            <div className="flex-1">
                              <span className="text-slate-800">{q.answer}</span>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Answered by Seller • {q.answered_at ? getRelativeTime(q.answered_at) : ""}
                              </div>
                            </div>
                          </div>
                        ) : isSeller ? (
                          <div className="pl-4 pt-1 flex gap-2">
                            <input
                              type="text"
                              placeholder="Type public answer to this student..."
                              value={replyText[q.id] || ""}
                              onChange={(e) =>
                                setReplyText((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleReplyQuestion(q.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                            >
                              Post Answer
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic pl-4">
                            Awaiting seller reply...
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Input box for students to ask a question */}
                {!isSeller && (
                  <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      required
                      placeholder="Ask a question about this item (e.g. Any scratches? Battery backup?)"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
                    />
                    <button
                      type="submit"
                      disabled={qaSubmitting || !newQuestion.trim()}
                      className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Ask Question</span>
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuctionDetailModal;
