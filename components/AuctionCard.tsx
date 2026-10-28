"use client";

import React, { useState, useEffect } from "react";
import { Clock, MapPin, Gavel, User, Sparkles, Heart } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export interface AuctionItem {
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
  status: string;
  start_time: string;
  end_time: string;
  handover_location: string | null;
  handover_status: string;
  seller_name?: string;
  seller_rating?: number;
  bids_count?: number;
  highest_bidder_name?: string;
}

interface AuctionCardProps {
  item: AuctionItem;
  onSelect: (item: AuctionItem) => void;
  currentUserId?: string;
}

export function AuctionCard({ item, onSelect, currentUserId }: AuctionCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [isEnded, setIsEnded] = useState<boolean>(false);

  useEffect(() => {
    function calculateCountdown() {
      const target = new Date(item.end_time).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0 || item.status !== "active") {
        setTimeLeft(item.status === "sold" ? "SOLD" : "AUCTION ENDED");
        setIsEnded(true);
        setIsUrgent(false);
        return;
      }

      setIsEnded(false);
      const totalSeconds = Math.floor(diff / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Urgent if less than 30 minutes
      setIsUrgent(totalSeconds < 1800);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`ENDS IN ${days}D ${hours % 24}H`);
      } else if (hours > 0) {
        setTimeLeft(
          `ENDS IN ${hours}H ${minutes.toString().padStart(2, "0")}M`
        );
      } else if (minutes > 0) {
        setTimeLeft(
          `ENDS IN ${minutes}M ${seconds.toString().padStart(2, "0")}S`
        );
      } else {
        setTimeLeft(`ENDS IN ${seconds}S!`);
      }
    }

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [item.end_time, item.status]);

  const isLeading = currentUserId && item.highest_bidder_id === currentUserId;
  const isSeller = currentUserId && item.seller_id === currentUserId;
  const coverImage =
    item.images && item.images.length > 0
      ? item.images[0]
      : "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=800&q=80";

  return (
    <div
      onClick={() => onSelect(item)}
      className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col cursor-pointer"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden">
        <img
          src={coverImage}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
          loading="lazy"
        />

        {/* Countdown Badge */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-10">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wide uppercase shadow-sm ${
              isEnded
                ? "bg-slate-800 text-slate-200"
                : isUrgent
                ? "bg-red-600 text-white animate-pulse"
                : "bg-slate-900/90 text-white backdrop-blur-xs"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}</span>
          </div>

          {/* User Status Pills */}
          {isLeading && (
            <div className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-xs">
              ✓ YOU ARE LEADING
            </div>
          )}
          {isSeller && (
            <div className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
              YOUR LISTING
            </div>
          )}
        </div>

        {/* Condition Badge */}
        <div className="absolute top-2.5 right-2.5 z-10">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white/95 text-slate-800 border border-slate-200 shadow-xs backdrop-blur-xs">
            {item.condition}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          {/* Category & Location */}
          <div className="flex items-center justify-between text-[11px] font-bold tracking-wider uppercase text-slate-500">
            <span>{item.category}</span>
            {item.handover_location && (
              <span className="flex items-center gap-1 truncate max-w-[140px] text-slate-400 font-normal lowercase first-letter:uppercase">
                <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                <span className="truncate">{item.handover_location}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
            {item.title}
          </h3>
        </div>

        {/* Price & Bid Stats */}
        <div className="pt-2 border-t border-slate-100 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {item.status === "active" ? "Current Leading Bid" : "Final Price"}
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight leading-none mt-0.5">
              {formatCurrency(item.current_price)}
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold text-slate-500">
              {item.bids_count !== undefined ? `${item.bids_count} bids` : "Active"}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item);
          }}
          className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center gap-1.5 ${
            isEnded
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : isLeading
              ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
              : "bg-white text-red-600 border border-red-600 hover:bg-red-600 hover:text-white"
          }`}
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>
            {isEnded
              ? "View Auction Result"
              : isLeading
              ? "You're Winning • View"
              : "Bid Now"}
          </span>
        </button>

      </div>
    </div>
  );
}
