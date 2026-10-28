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
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  Bot,
  User,
  Loader2,
  Tag,
  ChevronLeft,
  ChevronDown,
  Bike,
  Calculator,
  BookOpen,
  Shield,
  Zap,
  Image as ImageIcon,
  AudioLines,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio
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
  { label: "Find me a cycle under ₹2,000", query: "find me a cycle under 2000", icon: Bike },
  { label: "Have app bid for me on cycle up to ₹2,000", query: "have the app bid for me on the cycle up to 2000", icon: Gavel },
  { label: "Scientific calculators for exams", query: "Show scientific calculators approved for exams", icon: Calculator },
  { label: "Engineering Mathematics books", query: "Find Engineering Mathematics textbooks", icon: BookOpen },
  { label: "Strict budget & safety guardrails", query: "What are your student safety and budget guardrails?", icon: Shield },
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
  onOpen?: () => void;
  onClose?: () => void;
  onSelectListing?: (id: string) => void;
}

export function AiAssistantDrawer({
  isOpen: controlledIsOpen,
  onOpen: controlledOnOpen,
  onClose: controlledOnClose,
  onSelectListing,
}: AiAssistantDrawerProps = {}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (controlledOnOpen) {
      controlledOnOpen();
    } else {
      setInternalIsOpen(true);
    }
  };

  const { currentUser } = SafeUserConsumer();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // ChatGPT & Gemini Live Mode State
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [liveStatus, setLiveStatus] = useState<"listening" | "thinking" | "speaking" | "idle">("idle");
  const [userLiveTranscript, setUserLiveTranscript] = useState("");
  const [aiLiveTranscript, setAiLiveTranscript] = useState("");
  const [liveProposedBid, setLiveProposedBid] = useState<ProposedBidData | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Active Bid Card State
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
    setMessages([]);
    setUserLiveTranscript("");
    setAiLiveTranscript("");
    setLiveProposedBid(null);
  };

  // Live Audio Functions for Gemini 3.8 Live Mode
  const startLiveMode = async () => {
    setIsLiveMode(true);
    setLiveStatus("listening");
    setUserLiveTranscript("");
    setAiLiveTranscript("");

    // Initialize Web Audio API for frequency visualizer
    try {
      if (typeof window !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 64;
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudio = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
          animFrameRef.current = requestAnimationFrame(updateAudio);
        };
        updateAudio();
      }
    } catch (e) {
      console.warn("AudioContext error:", e);
    }

    // Initialize Web Speech Recognition
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-IN";

        rec.onresult = (event: any) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setUserLiveTranscript(transcript);
              handleLiveVoiceQuery(transcript);
            } else {
              interim += transcript;
              setUserLiveTranscript(interim);
            }
          }
        };

        rec.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
        };

        rec.onend = () => {
          // Keep listening if in live mode and not muted
          if (isLiveMode && !isMicMuted) {
            try {
              rec.start();
            } catch (e) {}
          }
        };

        try {
          rec.start();
          recognitionRef.current = rec;
        } catch (e) {}
      }
    }
  };

  const stopLiveMode = () => {
    setIsLiveMode(false);
    setLiveStatus("idle");
    setAudioLevel(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  const speakLiveResponse = (text: string) => {
    if (isSpeakerMuted || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setLiveStatus("listening");
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/[*#_`~•-]/g, "")
        .replace(/₹/g, " rupees ")
        .replace(/\n+/g, ". ");

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = "en-IN";

      utterance.onstart = () => {
        setLiveStatus("speaking");
      };

      utterance.onend = () => {
        setLiveStatus("listening");
      };

      utterance.onerror = () => {
        setLiveStatus("listening");
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setLiveStatus("listening");
    }
  };

  const handleLiveVoiceQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    setLiveStatus("thinking");

    // Add to chat history
    const userMsg: ChatMessage = {
      id: "live-user-" + Date.now(),
      role: "user",
      content: queryText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: queryText,
          history: historyPayload,
          userId: currentUser?.id,
        }),
      });

      if (!res.ok) throw new Error("API failed");
      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: "live-reply-" + Date.now(),
        role: "assistant",
        content: data.response || "Here are the campus listings matching your query.",
        items: data.items,
        proposedBid: data.proposedBid,
        timestamp: new Date(),
      };

      if (data.proposedBid) {
        const pb = data.proposedBid as ProposedBidData;
        setLiveProposedBid(pb);
        setActiveBidInputs((prev) => ({
          ...prev,
          [assistantMsg.id]: {
            amount: pb.proposed_amount,
            isProxy: pb.is_proxy,
            maxProxy: pb.max_proxy || pb.proposed_amount + pb.min_bid_increment * 2,
            isSubmitting: false,
            error: null,
          },
        }));
      }

      setMessages((prev) => [...prev, assistantMsg]);
      setAiLiveTranscript(data.response || "");

      // Speak back
      speakLiveResponse(data.response || "");
    } catch (err) {
      console.error("Live query failed:", err);
      setLiveStatus("listening");
    }
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
        content: data.response || "Here are the campus listings matching your query.",
        items: data.items,
        proposedBid: data.proposedBid,
        timestamp: new Date(),
      };

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
          "I couldn't reach the campus auction service right now. Please check your connection or try asking again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Bid Execution Handler
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

      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ["#dc2626", "#9333ea", "#2563eb", "#10b981", "#f59e0b"],
      });

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

  const renderFormattedText = (text: string) => {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, pIdx) => {
      if (para.includes("\n• ") || para.startsWith("• ") || para.startsWith("- ")) {
        const lines = para.split("\n");
        return (
          <ul key={pIdx} className="space-y-1.5 my-2 pl-2">
            {lines.map((line, lIdx) => {
              const clean = line.replace(/^[•\-]\s*/, "");
              return (
                <li key={lIdx} className="flex items-start gap-2 text-xs leading-relaxed text-slate-700">
                  <span className="text-red-500 font-bold shrink-0 mt-0.5">•</span>
                  <span>{formatInlineMarkdown(clean)}</span>
                </li>
              );
            })}
          </ul>
        );
      }

      if (para.startsWith("### ")) {
        return (
          <h4 key={pIdx} className="font-bold text-slate-900 text-sm mt-3 mb-1">
            {para.replace("### ", "")}
          </h4>
        );
      }

      return (
        <p key={pIdx} className="text-xs leading-relaxed my-1.5 text-slate-700">
          {formatInlineMarkdown(para)}
        </p>
      );
    });
  };

  const formatInlineMarkdown = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={idx} className="italic text-slate-600">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 bg-slate-100 text-purple-700 rounded text-[11px] font-mono border border-slate-200"
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
      {/* Redesigned Floating AI Trigger Icon (Red Theme matching CampusBid with Red Dot) */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 p-1.5 pr-4 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white rounded-full shadow-2xl shadow-red-950/40 border border-red-400/40 hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-red-400/50 hover:ring-red-300 cursor-pointer"
          aria-label="Open CampusBid AI Assistant"
        >
          {/* Iridescent Glowing Orb Icon in Red/Amber */}
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-amber-300 via-rose-500 to-red-700 p-0.5 shadow-md shadow-red-950/40">
            <div className="w-full h-full bg-red-950 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1.5">
              Ask AI
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-400"></span>
              </span>
            </span>
            <span className="text-[10px] text-red-100/90 font-medium">CampusBid Assistant</span>
          </div>
        </button>
      )}

      {/* Redesigned AI Chat Drawer (Closer to Reference Image) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={handleClose}
          />

          {/* Slide-over panel */}
          <div className="relative w-full max-w-md h-full flex flex-col z-10 animate-in slide-in-from-right duration-300">
            
            {/* Top Bar with Mesh Gradient (Reference 'Ai writing' aesthetic) */}
            <div className="bg-gradient-to-r from-[#170826] via-[#2c0944] to-[#450a24] text-white px-5 pt-5 pb-5 shrink-0 flex flex-col">
              
              {/* Down Chevron Drag Cue */}
              <div className="flex justify-center -mt-1 mb-2">
                <ChevronDown className="w-4 h-4 text-white/50" />
              </div>

              {/* Top Navigation Row */}
              <div className="flex items-center justify-between">
                {/* Back / Close Circular White Button */}
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white text-slate-900 flex items-center justify-center hover:bg-slate-100 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                  title="Close"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Title & Live Mode Launcher */}
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold tracking-wide text-white">
                    Ai writing &amp; bidding
                  </h2>
                  <button
                    onClick={startLiveMode}
                    className="px-2.5 py-1 rounded-full bg-gradient-to-r from-red-600 via-rose-600 to-amber-500 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-[10px] flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer ring-1 ring-white/30"
                    title="Launch Gemini 3.8 Live Voice Mode"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>Live Mode</span>
                  </button>
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="Reset Conversation"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Main Pure White Card Container */}
            <div className="bg-white rounded-t-3xl shadow-2xl flex-1 flex flex-col overflow-hidden -mt-2.5">
              
              {/* Scrollable Message Area */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                
                {/* Hero Centerpiece (Rendered when no conversation or at top) */}
                {messages.length === 0 && (
                  <div className="py-2 animate-in fade-in duration-300">
                    
                    {/* 3D Iridescent Liquid Orb (Reference centerpiece) */}
                    <div className="relative w-24 h-24 mx-auto my-3 flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#ff007a] via-[#7928ca] to-[#00dfd8] blur-xl opacity-60 animate-pulse" />
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-[#ff007a] via-[#7928ca] to-[#00dfd8] shadow-2xl p-0.5 overflow-hidden ring-4 ring-white/60 flex items-center justify-center">
                        <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-950/60 via-purple-700/40 to-pink-500/50 backdrop-blur-xs flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-white drop-shadow-md" />
                        </div>
                      </div>
                    </div>

                    {/* Headline */}
                    <div className="text-center px-4 mb-5">
                      <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                        Enhance your bidding <br />
                        with <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent font-extrabold">creative tools</span>
                      </h3>
                      <div className="flex items-center justify-center gap-2 mt-2.5">
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full border border-slate-200">
                          Text: Gemini 3.5 Flash Lite
                        </span>
                        <span className="text-[10px] font-bold bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full border border-red-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Audio: Gemini 3.8 Live
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Find cycles, calculators, books, and place safe confirmed bids.
                      </p>
                    </div>

                    {/* Capsule Quick Prompts (Matching Reference Pills) */}
                    <div className="flex flex-col gap-2 max-w-sm mx-auto">
                      {QUICK_PROMPTS.map((prompt, i) => {
                        const Icon = prompt.icon;
                        return (
                          <button
                            key={i}
                            onClick={() => sendMessage(prompt.query)}
                            className="w-full bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-full py-2.5 px-4 text-xs font-medium transition-all shadow-2xs hover:shadow-xs flex items-center gap-2.5 text-left group cursor-pointer"
                          >
                            <span className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-purple-100 text-slate-600 group-hover:text-purple-600 flex items-center justify-center shrink-0 transition-colors">
                              <Icon className="w-3.5 h-3.5" />
                            </span>
                            <span className="truncate">{prompt.label}</span>
                          </button>
                        );
                      })}
                    </div>

                  </div>
                )}

                {/* Conversation Messages */}
                {messages.map((message) => {
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ff007a] via-[#7928ca] to-[#00dfd8] p-0.5 shrink-0 mt-1">
                          <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}

                      <div className={`max-w-[85%] flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs ${
                            isUser
                              ? "bg-slate-900 text-white rounded-br-xs shadow-xs"
                              : "bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-xs shadow-2xs"
                          }`}
                        >
                          {isUser ? (
                            <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                          ) : (
                            renderFormattedText(message.content)
                          )}
                        </div>

                        {/* Rich Item Preview Cards inside chat (Only shown when not displaying a proposed bid) */}
                        {!message.proposedBid && message.items && message.items.length > 0 && (
                          <div className="w-full mt-2.5 space-y-2">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Found Auctions ({message.items.length})
                            </div>

                            <div className="space-y-2">
                              {message.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-3 flex gap-3 transition-all shadow-2xs group"
                                >
                                  <div className="relative w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                                    <img
                                      src={item.images?.[0] || "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80"}
                                      alt={item.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                  </div>

                                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
                                        <span>{item.category}</span>
                                        <span className="text-emerald-600">Active</span>
                                      </div>
                                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                                        {item.title}
                                      </h4>
                                    </div>

                                    <div className="flex items-center justify-between mt-1">
                                      <span className="text-xs font-bold text-slate-900">
                                        {formatCurrency(item.current_price)}
                                      </span>
                                      <button
                                        onClick={() => {
                                          if (onSelectListing) onSelectListing(item.id);
                                          sendMessage(`I want to propose a bid on "${item.title}"`);
                                        }}
                                        className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-[10px] rounded-lg transition-colors cursor-pointer"
                                      >
                                        Bid Now
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
                            <div className="bg-white border-2 border-amber-500/80 rounded-2xl p-4 shadow-lg">
                              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                                  <span className="text-xs font-bold text-slate-900">Proposed Bid Confirmation</span>
                                </div>
                                <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  Review &amp; Confirm
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 mb-3">
                                Bid for <strong className="text-slate-900">{message.proposedBid.listing_title}</strong>
                              </p>

                              {(() => {
                                const cardState = activeBidInputs[message.id] || {
                                  amount: message.proposedBid.proposed_amount,
                                  isProxy: message.proposedBid.is_proxy,
                                  maxProxy: message.proposedBid.max_proxy || message.proposedBid.proposed_amount + 100,
                                  isSubmitting: false,
                                  error: null,
                                };

                                if (message.bidPlaced?.success) {
                                  return (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold text-xs">
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Bid of {formatCurrency(cardState.amount)} Confirmed!</span>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const step = message.proposedBid?.min_bid_increment || 50;
                                          const newAmt = Math.max((cardState.amount || 0) - step, message.proposedBid?.min_next_bid || 0);
                                          setActiveBidInputs((prev) => ({
                                            ...prev,
                                            [message.id]: { ...cardState, amount: newAmt },
                                          }));
                                        }}
                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
                                      >
                                        -₹{message.proposedBid.min_bid_increment}
                                      </button>
                                      <input
                                        type="number"
                                        value={cardState.amount}
                                        onChange={(e) => {
                                          const val = Number(e.target.value);
                                          setActiveBidInputs((prev) => ({
                                            ...prev,
                                            [message.id]: { ...cardState, amount: val },
                                          }));
                                        }}
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 text-center"
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
                                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
                                      >
                                        +₹{message.proposedBid.min_bid_increment}
                                      </button>
                                    </div>

                                    {cardState.error && (
                                      <div className="p-2 bg-red-50 border border-red-200 rounded text-[11px] text-red-600">
                                        {cardState.error}
                                      </div>
                                    )}

                                    <button
                                      onClick={() => handleConfirmBid(message.id, message.proposedBid!)}
                                      disabled={cardState.isSubmitting}
                                      className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                      {cardState.isSubmitting ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Gavel className="w-3.5 h-3.5" />
                                      )}
                                      <span>Confirm &amp; Place Bid ({formatCurrency(cardState.amount)})</span>
                                    </button>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        <span className="text-[9px] text-slate-400 mt-1 px-1">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-2 items-center text-xs text-slate-500 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span>AI Assistant is analyzing campus listings...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Bottom Floating Prompt Bar (Matching Reference Image) */}
              <div className="p-4 border-t border-slate-100 bg-white shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-full p-1.5 pl-4 flex items-center gap-2 shadow-xs focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-400 transition-all"
                >
                  <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="write your prompt..."
                    disabled={isLoading}
                    className="w-full bg-transparent text-xs text-slate-800 placeholder-slate-400 border-none outline-none focus:outline-none focus:ring-0 shadow-none font-normal"
                    style={{ outline: "none", border: "none", boxShadow: "none" }}
                  />

                  {/* Circular Glowing Audio/Send Button (Matching reference) */}
                  {input.trim() ? (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-9 h-9 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 ring-2 ring-red-500/40 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
                      aria-label="Send Prompt"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startLiveMode}
                      className="w-9 h-9 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 ring-2 ring-purple-500/40 hover:ring-red-500/60 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer group"
                      aria-label="Gemini 3.8 Live Voice Mode"
                      title="Launch Gemini 3.8 Live Voice Mode"
                    >
                      <AudioLines className="w-4 h-4 text-purple-300 group-hover:text-red-400 transition-colors" />
                    </button>
                  )}
                </form>
              </div>

            </div>

            {/* Immersive ChatGPT & Gemini Live Mode Screen Overlay */}
            {isLiveMode && (
              <div className="absolute inset-0 z-30 bg-gradient-to-b from-[#090414] via-[#12071f] to-[#07010e] text-white flex flex-col justify-between p-6 animate-in fade-in duration-300">
                
                {/* Top Live Mode Navigation Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span className="text-white font-bold">Gemini 3.8 Live</span>
                    <span className="text-slate-400 text-[10px]">• Low Latency</span>
                  </div>
                  <button
                    onClick={stopLiveMode}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    title="Exit Live Mode"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Centerpiece: Organic Fluid Sound Sphere & Dynamic Resonance */}
                <div className="flex-1 flex flex-col items-center justify-center my-auto py-4">
                  
                  {/* Morphing Liquid Orb */}
                  <div className="relative w-44 h-44 flex items-center justify-center my-2">
                    {/* Ambient Glow Aura */}
                    <div
                      className={`absolute inset-0 rounded-full transition-all duration-150 ${
                        liveStatus === "listening"
                          ? "bg-red-500/25 blur-2xl animate-pulse"
                          : liveStatus === "speaking"
                          ? "bg-rose-500/35 blur-3xl animate-pulse"
                          : "bg-purple-600/20 blur-xl"
                      }`}
                      style={{
                        transform: `scale(${1 + (audioLevel / 100) * 0.4})`,
                      }}
                    />

                    {/* Concentric Ripple Ring */}
                    <div
                      className="absolute inset-2 rounded-full border border-red-400/30 transition-transform duration-100"
                      style={{
                        transform: `scale(${1 + (audioLevel / 100) * 0.2})`,
                      }}
                    />

                    {/* Core 3D Liquid Iridescent Sphere */}
                    <div className={`relative w-28 h-28 rounded-full shadow-2xl p-0.5 overflow-hidden ring-4 ring-white/30 flex items-center justify-center transition-transform duration-150 ${
                      liveStatus === "thinking" ? "animate-spin" : ""
                    }`}>
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#ff007a] via-[#7928ca] to-[#00dfd8] flex items-center justify-center">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-950 via-purple-900 to-rose-700 flex items-center justify-center shadow-inner">
                          {liveStatus === "listening" && <Mic className="w-8 h-8 text-white animate-pulse" />}
                          {liveStatus === "thinking" && <Sparkles className="w-8 h-8 text-amber-300 animate-spin" />}
                          {liveStatus === "speaking" && <Volume2 className="w-8 h-8 text-white animate-bounce" />}
                          {liveStatus === "idle" && <AudioLines className="w-8 h-8 text-white/80" />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* State Pill */}
                  <div className="mt-5 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700 text-xs font-semibold text-slate-200 shadow-md">
                    {liveStatus === "listening" && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                        <span>Listening to your voice...</span>
                      </>
                    )}
                    {liveStatus === "thinking" && (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        <span>Gemini 3.5 Flash Lite thinking...</span>
                      </>
                    )}
                    {liveStatus === "speaking" && (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                        <span>Gemini 3.8 Live speaking...</span>
                      </>
                    )}
                    {liveStatus === "idle" && <span>Tap mic to speak</span>}
                  </div>

                  {/* Live Subtitle Transcript */}
                  <div className="w-full max-w-sm mt-5 text-center min-h-[55px] px-2">
                    {userLiveTranscript && (
                      <p className="text-xs text-slate-300 italic mb-1.5 font-medium">
                        "{userLiveTranscript}"
                      </p>
                    )}
                    {aiLiveTranscript ? (
                      <div className="text-xs text-slate-100 font-medium leading-relaxed bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-left">
                        {renderFormattedText(aiLiveTranscript.slice(0, 240) + (aiLiveTranscript.length > 240 ? "..." : ""))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Try saying: "Find me a cycle under ₹2,000" or "Have the app bid for me"
                      </p>
                    )}
                  </div>

                  {/* Floating Safe Bid Proposal Card in Live Mode */}
                  {liveProposedBid && (
                    <div className="w-full max-w-sm mt-4 bg-slate-900/95 border-2 border-red-500/60 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-wider">
                          Safe Bid Drafted
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {liveProposedBid.listing_title}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          Bid: <strong>{formatCurrency(liveProposedBid.proposed_amount)}</strong> • Ceiling: <strong>{formatCurrency(liveProposedBid.max_proxy || 2000)}</strong>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleConfirmBid("live-reply-" + Date.now(), liveProposedBid);
                          setLiveProposedBid(null);
                        }}
                        className="px-3 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-md shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Authorize</span>
                      </button>
                    </div>
                  )}

                </div>

                {/* Bottom Studio Voice Dock (ChatGPT / Gemini Live style) */}
                <div className="flex items-center justify-center gap-5 pt-3 pb-1 border-t border-slate-800/80">
                  {/* Mic Mute Toggle */}
                  <button
                    onClick={() => {
                      if (isMicMuted) {
                        setIsMicMuted(false);
                        if (recognitionRef.current) {
                          try { recognitionRef.current.start(); } catch (e) {}
                        }
                      } else {
                        setIsMicMuted(true);
                        if (recognitionRef.current) {
                          try { recognitionRef.current.stop(); } catch (e) {}
                        }
                      }
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isMicMuted
                        ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        : "bg-white/10 text-white hover:bg-white/20 ring-2 ring-white/20"
                    }`}
                    title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-red-400" />}
                  </button>

                  {/* Red End Live Mode (Phone Hang-up) Button */}
                  <button
                    onClick={stopLiveMode}
                    className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-950/60 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-red-500/30"
                    title="End Live Voice Session"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>

                  {/* Speaker Output Toggle */}
                  <button
                    onClick={() => {
                      setIsSpeakerMuted(!isSpeakerMuted);
                      if (!isSpeakerMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
                        window.speechSynthesis.cancel();
                      }
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      isSpeakerMuted
                        ? "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        : "bg-white/10 text-white hover:bg-white/20 ring-2 ring-white/20"
                    }`}
                    title={isSpeakerMuted ? "Enable Voice Readout" : "Mute Voice Readout"}
                  >
                    {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-rose-300" />}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}

export default AiAssistantDrawer;
