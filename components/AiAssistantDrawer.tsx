"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  X,
  Send,
  Gavel,
  Clock,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  RotateCcw,
  Bot,
  User,
  Sliders,
  ArrowRight,
  Loader2,
  Tag,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useUser, StudentProfile } from "@/components/UserContext";
import type { ListingItemPreview, ProposedBidData } from "@/app/api/ai-assistant/route";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  items?: ListingItemPreview[];
  proposedBid?: ProposedBidData | null;
  timestamp: Date;
  bidPlaced?: {
    amount: number;
    proxyMax?: number | null;
    success: boolean;
    message?: string;
  };
}

const QUICK_PROMPTS = [
  { label: "🚲 Find cycles under ₹3,000", query: "Find cycles under ₹3,000" },
  { label: "🔢 Scientific calculators", query: "Show scientific calculators approved for exams" },
  { label: "⚡ Auctions closing soon", query: "Which auctions are closing soonest?" },
  { label: "📚 Engineering Mathematics books", query: "Find Engineering Mathematics textbooks" },
];

function SafeUserConsumer(): { currentUser: StudentProfile } {
  try {
    const userContext = useUser();
    return { currentUser: userContext.currentUser };
  } catch {
    return {
      currentUser: {
        id: "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22",
        full_name: "Ananya Patel",
        email: "ananya.patel@campus.edu",
        role: "buyer",
        student_id: "2023EEB1108",
        hostel_block: "Hostel 7 (Kaveri - Girls)",
        room_number: "G-102",
        phone_number: "+91 98765 43211",
        avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
        rating: 5.0,
        total_ratings: 6,
      },
    };
  }
}

export interface AiAssistantDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectListing?: (id: string) => void;
}

export function AiAssistantDrawer({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSelectListing,
}: AiAssistantDrawerProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const { currentUser } = SafeUserConsumer();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "👋 Hi **" +
        (currentUser?.full_name?.split(" ")[0] || "there") +
        "**! I'm your **CampusBid AI Assistant**, powered by Gemini 2.5 Flash.\n\n" +
        "I can help you search verified campus auctions, check live prices, and draft safe proposed bids.\n\n" +
        "🛡️ *Safety Guarantee: I never place bids automatically. Every bid requires your explicit confirmation on an action card.*",
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeBidInputs, setActiveBidInputs] = useState<
    Record<
      string,
      {
        amount: number;
        isProxy: boolean;
        maxProxy: number;
        isSubmitting: boolean;
        error: string | null;
      }
    >
  >({});

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Listen to custom open events from top navbar or buttons
  useEffect(() => {
    const handleOpenEvent = () => {
      if (isControlled && controlledOnClose) {
        // Parent controlled
      } else {
        setInternalIsOpen(true);
      }
    };

    window.addEventListener("campusbid:open-ai-assistant", handleOpenEvent);
    return () => {
      window.removeEventListener("campusbid:open-ai-assistant", handleOpenEvent);
    };
  }, [isControlled, controlledOnClose]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    }
  }, [isOpen]);

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleReset = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content:
          "✨ Chat history reset. How can I help you explore campus auctions today?",
        timestamp: new Date(),
      },
    ]);
  };

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          userId: currentUser?.id,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: "reply-" + Date.now(),
        role: "assistant",
        content: data.response || "Here are the results for your request.",
        items: data.items,
        proposedBid: data.proposedBid,
        timestamp: new Date(),
      };

      // Initialize bid card state if proposedBid is present
      if (data.proposedBid) {
        const pb = data.proposedBid as ProposedBidData;
        setActiveBidInputs((prev) => ({
          ...prev,
          [assistantMessage.id]: {
            amount: pb.proposed_amount,
            isProxy: pb.is_proxy,
            maxProxy: pb.max_proxy || pb.proposed_amount + pb.min_bid_increment * 2,
            isSubmitting: false,
            error: null,
          },
        }));
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      console.error("AI Assistant request failed:", err);
      const errorMessage: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content:
          "⚠️ I couldn't reach the campus auction service right now. Please check your connection or try asking again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Bid Execution Handler: Called ONLY upon explicit user click
  const handleConfirmBid = async (messageId: string, proposedBid: ProposedBidData) => {
    const cardState = activeBidInputs[messageId] || {
      amount: proposedBid.proposed_amount,
      isProxy: proposedBid.is_proxy,
      maxProxy: proposedBid.max_proxy || proposedBid.proposed_amount + 100,
      isSubmitting: false,
      error: null,
    };

    if (cardState.isSubmitting) return;

    if (cardState.amount < proposedBid.min_next_bid) {
      setActiveBidInputs((prev) => ({
        ...prev,
        [messageId]: {
          ...cardState,
          error: `Bid amount must be at least ${formatCurrency(proposedBid.min_next_bid)}`,
        },
      }));
      return;
    }

    setActiveBidInputs((prev) => ({
      ...prev,
      [messageId]: { ...cardState, isSubmitting: true, error: null },
    }));

    try {
      const bidderId = currentUser?.id || "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

      const rpcParams: {
        p_listing_id: string;
        p_bidder_id: string;
        p_amount: number;
        p_max_proxy_amount?: number;
      } = {
        p_listing_id: proposedBid.listing_id,
        p_bidder_id: bidderId,
        p_amount: Number(cardState.amount),
      };

      if (cardState.isProxy && cardState.maxProxy) {
        rpcParams.p_max_proxy_amount = Number(cardState.maxProxy);
      }

      const { data, error } = await supabase.rpc("place_bid_atomic", rpcParams);

      if (error) {
        throw new Error(error.message || "Failed to place bid.");
      }

      // Celebratory Confetti blast!
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#dc2626", "#9333ea", "#2563eb", "#10b981", "#f59e0b"],
      });

      // Update message card state to placed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                bidPlaced: {
                  amount: cardState.amount,
                  proxyMax: cardState.isProxy ? cardState.maxProxy : null,
                  success: true,
                  message: (data as any)?.message || "Your bid was successfully placed!",
                },
              }
            : msg
        )
      );

      // Add assistant confirmation response
      const outcomeMsg = (data as any)?.message || "Your bid was placed and is currently leading!";
      const confirmationReply: ChatMessage = {
        id: "confirm-" + Date.now(),
        role: "assistant",
        content: `🎉 **Bid Confirmed!**\n\n` +
          `You placed a bid of **${formatCurrency(cardState.amount)}** on **"${proposedBid.listing_title}"**.\n\n` +
          `📢 **Auction Status**: ${outcomeMsg}\n` +
          `📍 **Campus Handover Location**: ${proposedBid.handover_location || "Central Campus"}\n\n` +
          `*We'll notify you if someone places a higher bid or if you win the auction!*`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, confirmationReply]);

      setActiveBidInputs((prev) => ({
        ...prev,
        [messageId]: { ...cardState, isSubmitting: false, error: null },
      }));
    } catch (err: any) {
      console.error("place_bid_atomic error:", err);
      setActiveBidInputs((prev) => ({
        ...prev,
        [messageId]: {
          ...cardState,
          isSubmitting: false,
          error: err.message || "An unexpected error occurred while placing your bid.",
        },
      }));
    }
  };

  // Render markdown-like simple text formatting
  const renderFormattedText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, pIdx) => {
      // Check for bullet lists
      if (para.includes("\n• ") || para.startsWith("• ") || para.startsWith("- ")) {
        const lines = para.split("\n");
        return (
          <ul key={pIdx} className="space-y-1.5 my-2 pl-2">
            {lines.map((line, lIdx) => {
              const clean = line.replace(/^[•\-]\s*/, "");
              return (
                <li key={lIdx} className="flex items-start gap-2 text-xs leading-relaxed">
                  <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                  <span>{formatInlineMarkdown(clean)}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      // Check for headers (### or ##)
      if (para.startsWith("### ")) {
        return (
          <h4 key={pIdx} className="font-bold text-slate-100 text-sm mt-3 mb-1">
            {para.replace("### ", "")}
          </h4>
        );
      }

      return (
        <p key={pIdx} className="text-xs leading-relaxed my-1.5 text-slate-200">
          {formatInlineMarkdown(para)}
        </p>
      );
    });
  };

  const formatInlineMarkdown = (line: string) => {
    // Split by bold (**text**)
    const parts = line.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={idx} className="italic text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 bg-slate-800 text-purple-300 rounded font-mono text-[11px] border border-slate-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button (Always visible on screen) */}
      {!isOpen && (
        <button
          onClick={() => (isControlled && controlledOnClose ? null : setInternalIsOpen(true))}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-red-600 via-rose-600 to-purple-600 hover:from-red-500 hover:to-purple-500 text-white rounded-full shadow-xl shadow-red-900/30 hover:shadow-red-800/50 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
          aria-label="Open CampusBid AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900 animate-ping" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-black tracking-tight leading-none uppercase">
              CampusBid AI
            </span>
            <span className="text-[10px] text-white/80 font-medium">Gemini 2.5</span>
          </div>
        </button>
      )}

      {/* Slide-over Drawer Backdrop & Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop overlay */}
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={handleClose}
          />

          {/* Slide-over panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <aside className="w-screen max-w-md sm:max-w-lg bg-slate-900 text-slate-100 shadow-2xl flex flex-col border-l border-slate-800 animate-in slide-in-from-right duration-300">
              {/* Header */}
              <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-red-600 via-purple-600 to-indigo-600 p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white tracking-tight leading-none">
                        CampusBid AI Assistant
                      </h2>
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        Gemini 2.5
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>Bidding as:</span>
                      <span className="font-semibold text-slate-200">
                        {currentUser?.full_name || "Guest Student"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleReset}
                    title="Reset Conversation"
                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClose}
                    title="Close Drawer"
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Message Scroll Area */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                      )}

                      <div className={`max-w-[88%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                        {/* Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-3 text-xs shadow-sm ${
                            isUser
                              ? "bg-red-600 text-white rounded-br-none"
                              : "bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none"
                          }`}
                        >
                          {isUser ? (
                            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          ) : (
                            renderFormattedText(message.content)
                          )}
                        </div>

                        {/* Rich Item Preview Cards inside chat */}
                        {message.items && message.items.length > 0 && (
                          <div className="w-full mt-3 space-y-2.5">
                            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                              <Tag className="w-3 h-3 text-purple-400" />
                              <span>Found Campus Auctions ({message.items.length})</span>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              {message.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-xl p-3 flex gap-3 transition-all duration-150 group"
                                >
                                  {/* Item Image */}
                                  <div className="relative w-20 h-20 bg-slate-900 rounded-lg overflow-hidden shrink-0 border border-slate-700">
                                    <img
                                      src={
                                        item.images?.[0] ||
                                        "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80"
                                      }
                                      alt={item.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[9px] font-bold bg-slate-900/80 text-white rounded backdrop-blur">
                                      {item.condition}
                                    </span>
                                  </div>

                                  {/* Item Info */}
                                  <div className="flex-1 flex flex-col justify-between min-w-0">
                                    <div>
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">
                                          {item.category}
                                        </span>
                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                          <Clock className="w-2.5 h-2.5 text-amber-400" />
                                          Active
                                        </span>
                                      </div>
                                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors">
                                        {item.title}
                                      </h4>
                                    </div>

                                    <div className="flex items-end justify-between gap-2 mt-2 pt-2 border-t border-slate-700/60">
                                      <div>
                                        <span className="text-[10px] text-slate-400 block">Current Bid</span>
                                        <span className="text-sm font-extrabold text-white tracking-tight">
                                          {formatCurrency(item.current_price)}
                                        </span>
                                      </div>

                                      <button
                                        onClick={() => {
                                          if (onSelectListing) {
                                            onSelectListing(item.id);
                                          }
                                          sendMessage(
                                            `I want to propose a bid on "${item.title}" (ID: ${item.id})`
                                          );
                                        }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] rounded-lg transition-colors shadow-sm"
                                      >
                                        <Gavel className="w-3 h-3" />
                                        <span>View &amp; Bid</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Proposed Bid Confirmation Card */}
                        {message.proposedBid && (
                          <div className="w-full mt-3">
                            <div className="bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-amber-500/60 rounded-xl p-4 shadow-xl">
                              {/* Guardrail Banner */}
                              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-700/80">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                                    <ShieldAlert className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <h5 className="text-xs font-bold text-amber-300">
                                      Proposed Bid Action
                                    </h5>
                                    <p className="text-[10px] text-slate-400">
                                      Confirmation required &bull; AI never auto-bids
                                    </p>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  Review
                                </span>
                              </div>

                              {/* Target Item Details */}
                              <div className="flex gap-3 mb-3">
                                {message.proposedBid.image && (
                                  <img
                                    src={message.proposedBid.image}
                                    alt={message.proposedBid.listing_title}
                                    className="w-14 h-14 object-cover rounded-lg border border-slate-700 shrink-0"
                                  />
                                )}
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-semibold text-purple-400 uppercase">
                                    {message.proposedBid.category}
                                  </span>
                                  <h4 className="text-xs font-bold text-white line-clamp-2">
                                    {message.proposedBid.listing_title}
                                  </h4>
                                  <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                    {message.proposedBid.handover_location || "Campus Meetup"}
                                  </p>
                                </div>
                              </div>

                              {/* Price Comparison */}
                              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 mb-3">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Current Leading Bid</span>
                                  <span className="text-xs font-bold text-slate-300">
                                    {formatCurrency(message.proposedBid.current_price)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Next Minimum Bid</span>
                                  <span className="text-xs font-extrabold text-emerald-400">
                                    {formatCurrency(message.proposedBid.min_next_bid)}
                                  </span>
                                </div>
                              </div>

                              {/* Interactive Bid Configuration Form */}
                              {(() => {
                                const cardState = activeBidInputs[message.id] || {
                                  amount: message.proposedBid.proposed_amount,
                                  isProxy: message.proposedBid.is_proxy,
                                  maxProxy:
                                    message.proposedBid.max_proxy ||
                                    message.proposedBid.proposed_amount + 200,
                                  isSubmitting: false,
                                  error: null,
                                };

                                const isPlaced = Boolean(message.bidPlaced?.success);

                                if (isPlaced) {
                                  return (
                                    <div className="bg-emerald-950/50 border border-emerald-500/40 rounded-lg p-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-xs">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Bid of {formatCurrency(message.bidPlaced?.amount || cardState.amount)} Placed!</span>
                                      </div>
                                      <p className="text-[11px] text-slate-400 mt-1">
                                        {message.bidPlaced?.message || "You are currently leading on this auction."}
                                      </p>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    {/* Amount Modifier */}
                                    <div>
                                      <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                                        Your Target Bid (₹):
                                      </label>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const step = message.proposedBid?.min_bid_increment || 50;
                                            const newAmt = Math.max(
                                              (cardState.amount || 0) - step,
                                              message.proposedBid?.min_next_bid || 0
                                            );
                                            setActiveBidInputs((prev) => ({
                                              ...prev,
                                              [message.id]: { ...cardState, amount: newAmt },
                                            }));
                                          }}
                                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700"
                                        >
                                          -₹{message.proposedBid.min_bid_increment}
                                        </button>

                                        <input
                                          type="number"
                                          min={message.proposedBid.min_next_bid}
                                          step={message.proposedBid.min_bid_increment}
                                          value={cardState.amount}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setActiveBidInputs((prev) => ({
                                              ...prev,
                                              [message.id]: { ...cardState, amount: val },
                                            }));
                                          }}
                                          className="flex-1 bg-slate-900 border border-slate-700 focus:border-red-500 rounded px-3 py-1.5 text-xs font-bold text-white text-center focus:outline-none"
                                        />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const step = message.proposedBid?.min_bid_increment || 50;
                                            const newAmt = (cardState.amount || 0) + step;
                                            setActiveBidInputs((prev) => ({
                                              ...prev,
                                              [message.id]: { ...cardState, amount: newAmt },
                                            }));
                                          }}
                                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded border border-slate-700"
                                        >
                                          +₹{message.proposedBid.min_bid_increment}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Proxy Bidding Checkbox */}
                                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={cardState.isProxy}
                                          onChange={(e) => {
                                            setActiveBidInputs((prev) => ({
                                              ...prev,
                                              [message.id]: {
                                                ...cardState,
                                                isProxy: e.target.checked,
                                              },
                                            }));
                                          }}
                                          className="rounded border-slate-700 text-red-600 focus:ring-red-500 w-3.5 h-3.5 bg-slate-800"
                                        />
                                        <span className="text-[11px] font-semibold text-slate-300">
                                          Enable Automated Proxy Bidding
                                        </span>
                                      </label>

                                      {cardState.isProxy && (
                                        <div className="mt-2 pl-5">
                                          <span className="text-[10px] text-slate-400 block mb-1">
                                            Auto-counter bids up to maximum ceiling (₹):
                                          </span>
                                          <input
                                            type="number"
                                            min={cardState.amount}
                                            value={cardState.maxProxy}
                                            onChange={(e) => {
                                              const maxVal = Number(e.target.value);
                                              setActiveBidInputs((prev) => ({
                                                ...prev,
                                                [message.id]: { ...cardState, maxProxy: maxVal },
                                              }));
                                            }}
                                            placeholder="Max proxy budget"
                                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-red-500"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Error Banner */}
                                    {cardState.error && (
                                      <div className="p-2 bg-red-950/70 border border-red-500/50 rounded text-[11px] text-red-300 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                        <span>{cardState.error}</span>
                                      </div>
                                    )}

                                    {/* Notice */}
                                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5 text-amber-400" />
                                      Anti-sniping protection: bids in last 30s extend auction by 60s.
                                    </p>

                                    {/* Confirm Bid Button */}
                                    <button
                                      onClick={() => handleConfirmBid(message.id, message.proposedBid!)}
                                      disabled={cardState.isSubmitting}
                                      className="w-full py-2.5 px-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-lg shadow-lg shadow-red-900/40 hover:shadow-red-800/60 transition-all flex items-center justify-center gap-2 border border-red-400/30"
                                    >
                                      {cardState.isSubmitting ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>Authorizing Atomic Bid...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Gavel className="w-4 h-4" />
                                          <span>
                                            Confirm &amp; Place Bid of {formatCurrency(cardState.amount)}
                                          </span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        <span className="text-[9px] text-slate-500 mt-1 px-1">
                          {message.timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {isUser && (
                        <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-4 h-4 text-red-400" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading typing indicator */}
                {isLoading && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-2 h-2 bg-red-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" />
                      <span className="text-[11px] text-slate-400 ml-1.5 font-medium">
                        Gemini is analyzing campus auctions...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Quick Prompt Chips */}
              <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/60">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                  {QUICK_PROMPTS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => sendMessage(chip.query)}
                      disabled={isLoading}
                      className="shrink-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:border-slate-600 text-slate-300 hover:text-white rounded-full text-[11px] font-medium border border-slate-700 transition-colors"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Bar */}
              <div className="p-4 border-t border-slate-800 bg-slate-900 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about cycles, calculators, or say 'bid on cycle'..."
                      disabled={isLoading}
                      className="w-full bg-slate-950 border border-slate-700 focus:border-red-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="p-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white rounded-xl transition-colors shrink-0 shadow-md shadow-red-900/30"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 px-1">
                  <span>Guaranteed safe bidding &bull; 100% verified campus listings</span>
                  <span>Powered by Google Gemini</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}
    </>
  );
}

export default AiAssistantDrawer;
