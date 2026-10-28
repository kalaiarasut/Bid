"use client";

import React, { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Gavel,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Bike,
  Calculator,
  BookOpen,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  User,
  Zap,
  Radio
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/components/UserContext";
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
  { label: "Casio scientific calculators for exams", query: "Show Casio calculators under ₹1,000", icon: Calculator },
  { label: "Engineering Mathematics textbooks", query: "Find Engineering Mathematics textbooks", icon: BookOpen },
  { label: "What are your student safety & budget rules?", query: "What are your student safety and budget guardrails?", icon: Shield },
];

interface AiAssistantTabProps {
  onSelectListing?: (id: string) => void;
}

export function AiAssistantTab({ onSelectListing }: AiAssistantTabProps) {
  const { currentUser } = useUser();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Live Audio Interaction State (Gemini 3.8 Live)
  const [isListening, setIsListening] = useState(false);
  const [isVoiceOutputEnabled, setIsVoiceOutputEnabled] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [audioLevel, setAudioLevel] = useState<number>(0);

  // Active Bid Cards State
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
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-IN";

        recognition.onstart = () => {
          setIsListening(true);
          setInterimTranscript("");
        };

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setInterimTranscript(current);

          if (event.results[0].isFinal) {
            handleSend(current);
            stopListening();
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
          setIsListening(false);
          setInterimTranscript("");
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      stopListening();
    };
  }, []);

  // Mic Toggle
  const toggleListening = async () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);

        // Start Web Audio API volume animation
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 64;
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(100, Math.round((avg / 255) * 100)));
            animFrameRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        }
      } catch (err) {
        console.warn("Microphone start error:", err);
      }
    } else {
      alert("Speech recognition is not supported in this browser. Please type your message.");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
    setAudioLevel(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
    }
  };

  // Text-To-Speech (Gemini 3.8 Live Voice output)
  const speakResponse = (text: string) => {
    if (!isVoiceOutputEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
      // Clean markdown tags for spoken voice
      const clean = text
        .replace(/[*#_`~•-]/g, "")
        .replace(/₹/g, " rupees ")
        .replace(/\n+/g, ". ");
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.lang = "en-IN";
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS error:", e);
    }
  };

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, interimTranscript]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome-msg",
          role: "assistant",
          content: `👋 **Welcome to the CampusBid AI Assistant!**\n\nDon't want to search and compare? Just say **"find me a cycle under ₹2,000"** and I'll give you a straight answer, or have the app safely bid for you!\n\n🛡️ **The 3 Golden Campus Rules I Play By:**\n• **Student's Go-Ahead Only**: I will *never* execute a bid without your explicit click on a confirmation card.\n• **Strict Agreed Limit**: I will *never* exceed your agreed budget ceiling.\n• **Zero Private Data Leakage**: Student account details, emails, and room numbers remain 100% confidential.\n\n*Tap any quick prompt below or use the microphone to start speaking!*`,
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
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

      // Speak response out loud if enabled
      speakResponse(data.response || "Here are the campus listings matching your query.");
    } catch (err: any) {
      console.error("AI Assistant request failed:", err);
      const errorMessage: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: "I couldn't reach the campus auction service right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Safe Bid Confirmation Handler
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
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#dc2626", "#e11d48", "#9333ea", "#2563eb", "#10b981"],
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
        content: `🎉 **Bid Confirmed & Active!**\n\n` +
          `You placed a bid of **${formatCurrency(cardState.amount)}** on **"${proposedBid.listing_title}"**.\n\n` +
          `📢 **Auction Status**: ${outcomeMsg}\n` +
          `📍 **Campus Handover Location**: ${proposedBid.handover_location || "Central Campus"}\n\n` +
          `*We'll notify you if someone places a higher bid or if you win the auction!*`,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, confirmationReply]);

      speakResponse(`Bid confirmed for ${formatCurrency(cardState.amount)} on ${proposedBid.listing_title}!`);

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

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-slate-900 text-slate-100 flex flex-col items-center">
      
      {/* Top AI Command Header & Model Indicators */}
      <div className="w-full bg-slate-950/80 border-b border-slate-800 backdrop-blur-md sticky top-16 z-20 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title and Voice Waveform Status */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-600 to-amber-500 flex items-center justify-center shadow-lg shadow-red-900/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  CampusBid <span className="text-red-500">AI Assistant</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct answers & safe autonomous proxy bidding without the search fatigue
              </p>
            </div>
          </div>

          {/* Model Badges and Voice Toggle */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300">
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>Live Audio: <strong className="text-white">Gemini 3.8 Live</strong></span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700/80 text-[11px] font-medium text-slate-300">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Text Reasoning: <strong className="text-white">Gemini 3.5 Flash Lite</strong></span>
            </div>
            <button
              onClick={() => setIsVoiceOutputEnabled(!isVoiceOutputEnabled)}
              title={isVoiceOutputEnabled ? "Mute Voice Readout" : "Enable Voice Readout"}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                isVoiceOutputEnabled
                  ? "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30"
                  : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
              }`}
            >
              {isVoiceOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden sm:inline">{isVoiceOutputEnabled ? "Voice On" : "Voice Muted"}</span>
            </button>
            <button
              onClick={() => setMessages([])}
              title="Reset conversation"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-6xl w-full flex-1 flex flex-col px-4 sm:px-6 py-6 gap-6">

        {/* The 3 Golden Rules Guardrails Trust Banner */}
        <div className="w-full bg-gradient-to-r from-slate-800/80 via-slate-800/40 to-slate-800/80 border border-slate-700/60 rounded-3xl p-4 sm:p-5 shadow-xl">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-red-400" />
            <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-300">
              Strict Campus Fair-Bidding & Privacy Guarantees
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/40">
              <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lock className="w-4 h-4 text-red-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Student's Go-Ahead Only</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  The AI never acts on its own. Every bid requires your explicit click on a confirmation card.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/40">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Never Past Agreed Limit</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Strictly caps automated proxy bidding at your agreed ceiling (e.g. max ₹2,000). Never exceeds budget.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-700/40">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">100% Pseudonymous Privacy</h4>
                <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                  Student phone numbers, emails, and room numbers are never revealed. Handovers in verified campus zones.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Capsules */}
        <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(qp.query)}
                className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 hover:border-red-500/50 text-xs font-medium text-slate-200 transition-all shadow-xs group"
              >
                <Icon className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Chat Feed */}
        <div className="w-full flex-1 flex flex-col gap-4 pb-28">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-red-950/50">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[78%] rounded-3xl p-4 sm:p-5 shadow-lg ${
                  msg.role === "user"
                    ? "bg-red-600 text-white rounded-br-xs"
                    : "bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-xs"
                }`}
              >
                {/* Formatted Content */}
                <div className="text-sm leading-relaxed whitespace-pre-line font-normal space-y-2">
                  {msg.content}
                </div>

                {/* Embedded Listing Preview Cards (Straight answer item display, shown when no bid proposed) */}
                {!msg.proposedBid && msg.items && msg.items.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-700/70 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {msg.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900/90 border border-slate-700 rounded-2xl p-3 flex gap-3 hover:border-red-500/50 transition-all group shadow-md"
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative">
                          {item.images?.[0] ? (
                            <img
                              src={item.images[0]}
                              alt={item.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                              No Image
                            </div>
                          )}
                          <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/70 text-white px-1.5 py-0.5 rounded-sm">
                            {item.condition}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-red-400 transition-colors">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                              <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                              <span className="truncate">{item.handover_location || "Central Campus"}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800">
                            <div>
                              <span className="text-[10px] text-slate-400 block -mb-0.5">Current Bid</span>
                              <span className="text-xs font-extrabold text-emerald-400">
                                {formatCurrency(item.current_price)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {onSelectListing && (
                                <button
                                  onClick={() => onSelectListing(item.id)}
                                  className="text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                                >
                                  View
                                </button>
                              )}
                              <button
                                onClick={() => handleSend(`have the app bid for me on ${item.title} up to 2000`)}
                                className="text-[11px] font-bold text-white px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 transition-colors flex items-center gap-1"
                              >
                                <Gavel className="w-3 h-3" />
                                <span>Bid</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Safe Proposed Bid Authorization Card */}
                {msg.proposedBid && (
                  <div className="mt-4 pt-3 border-t border-slate-700/80">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-red-500/40 rounded-2xl p-4 shadow-xl">
                      
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
                            <Gavel className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-white block">
                              Safe Autonomous Bid Proposal
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Requires student go-ahead • Hard budget ceiling active
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                          Pending Confirmation
                        </span>
                      </div>

                      {/* Item Details */}
                      <div className="flex items-center gap-3 my-3">
                        {msg.proposedBid.image && (
                          <img
                            src={msg.proposedBid.image}
                            alt={msg.proposedBid.listing_title}
                            className="w-14 h-14 rounded-xl object-cover border border-slate-800 shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate">
                            {msg.proposedBid.listing_title}
                          </h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                            <span>{msg.proposedBid.handover_location || "Campus Handover"}</span>
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs">
                            <span className="text-slate-400">
                              Current: <strong className="text-white">{formatCurrency(msg.proposedBid.current_price)}</strong>
                            </span>
                            <span className="text-slate-400">
                              Min Required: <strong className="text-emerald-400">{formatCurrency(msg.proposedBid.min_next_bid)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Bid Amount & Agreed Limit Adjustment */}
                      {msg.bidPlaced ? (
                        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center gap-2.5 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          <div>
                            <div>Bid authorized & active at {formatCurrency(msg.bidPlaced.amount)}!</div>
                            {msg.bidPlaced.proxyMax && (
                              <div className="text-[11px] text-emerald-400/80 font-normal mt-0.5">
                                Proxy ceiling locked at {formatCurrency(msg.bidPlaced.proxyMax)}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="text-[11px] font-bold text-slate-300 block">Proposed Next Bid</span>
                              <div className="flex items-center gap-2 mt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curr = activeBidInputs[msg.id]?.amount || msg.proposedBid!.proposed_amount;
                                    const min = msg.proposedBid!.min_next_bid;
                                    const step = msg.proposedBid!.min_bid_increment;
                                    const next = Math.max(min, curr - step);
                                    setActiveBidInputs((prev) => ({
                                      ...prev,
                                      [msg.id]: {
                                        ...(prev[msg.id] || {
                                          isProxy: true,
                                          maxProxy: msg.proposedBid!.max_proxy || 2000,
                                          isSubmitting: false,
                                          error: null,
                                        }),
                                        amount: next,
                                      },
                                    }));
                                  }}
                                  className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
                                >
                                  -
                                </button>
                                <span className="text-sm font-black text-white px-2">
                                  {formatCurrency(activeBidInputs[msg.id]?.amount || msg.proposedBid.proposed_amount)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curr = activeBidInputs[msg.id]?.amount || msg.proposedBid!.proposed_amount;
                                    const step = msg.proposedBid!.min_bid_increment;
                                    const next = curr + step;
                                    setActiveBidInputs((prev) => ({
                                      ...prev,
                                      [msg.id]: {
                                        ...(prev[msg.id] || {
                                          isProxy: true,
                                          maxProxy: msg.proposedBid!.max_proxy || 2000,
                                          isSubmitting: false,
                                          error: null,
                                        }),
                                        amount: next,
                                      },
                                    }));
                                  }}
                                  className="w-7 h-7 rounded-lg bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Agreed Budget Ceiling */}
                            <div className="sm:text-right">
                              <span className="text-[11px] font-bold text-slate-300 block">Agreed Budget Ceiling</span>
                              <span className="text-sm font-black text-rose-400">
                                {formatCurrency(activeBidInputs[msg.id]?.maxProxy || msg.proposedBid.max_proxy || 2000)}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                Never bids a rupee past this
                              </span>
                            </div>
                          </div>

                          {/* Error notice if any */}
                          {activeBidInputs[msg.id]?.error && (
                            <p className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{activeBidInputs[msg.id]?.error}</span>
                            </p>
                          )}

                          {/* Explicit Go-Ahead Confirm Button */}
                          <button
                            type="button"
                            disabled={activeBidInputs[msg.id]?.isSubmitting}
                            onClick={() => handleConfirmBid(msg.id, msg.proposedBid!)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white font-extrabold text-xs shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                          >
                            {activeBidInputs[msg.id]?.isSubmitting ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Securing Bid on Blockchain...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm & Place Bid (Student Go-Ahead)</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                <div className="text-[10px] text-slate-500 mt-2 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Interim transcript when listening */}
          {isListening && interimTranscript && (
            <div className="flex gap-3 justify-end">
              <div className="max-w-[75%] rounded-3xl p-3.5 bg-red-600/80 text-white text-xs italic flex items-center gap-2 animate-pulse">
                <Mic className="w-4 h-4" />
                <span>Listening: "{interimTranscript}"</span>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="flex gap-3 items-center text-slate-400 text-xs pl-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-4 h-4 text-white animate-spin" />
              </div>
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-4 py-2 rounded-2xl">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                <span>Gemini 3.5 Flash Lite is reasoning...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

      </div>

      {/* Floating Bottom Voice & Text Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/90 border-t border-slate-800 backdrop-blur-xl p-3 sm:p-4">
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          
          {/* Active Voice Waveform Bar if listening */}
          {isListening && (
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                <span className="font-bold">Gemini 3.8 Live is listening...</span>
              </div>
              {/* Dynamic waveform bars */}
              <div className="flex items-center gap-1 h-4">
                {[12, 28, 16, 36, 20, 42, 18, 30].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-red-400 rounded-full transition-all duration-75"
                    style={{
                      height: `${Math.max(4, Math.round((h * (audioLevel || 30)) / 40))}px`,
                    }}
                  />
                ))}
              </div>
              <button
                onClick={stopListening}
                className="text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 px-2.5 py-1 rounded-lg"
              >
                Stop
              </button>
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-2xl p-1.5 focus-within:border-red-500 transition-colors shadow-2xl"
          >
            {/* Live Audio Microphone Button */}
            <button
              type="button"
              onClick={toggleListening}
              title={isListening ? "Stop Listening" : "Speak with Gemini 3.8 Live"}
              className={`p-3 rounded-xl transition-all relative flex items-center justify-center shrink-0 ${
                isListening
                  ? "bg-red-600 text-white ring-4 ring-red-500/40 animate-pulse"
                  : "bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
              }`}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              {isListening && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-400 animate-ping" />
              )}
            </button>

            {/* Query Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. Find me a cycle under ₹2,000, or have the app bid for me..."
              className="flex-1 bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-sm text-white placeholder:text-slate-400 px-2 py-1.5 font-medium"
              style={{ outline: "none", border: "none", boxShadow: "none" }}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 shadow-md shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      </div>

    </div>
  );
}
