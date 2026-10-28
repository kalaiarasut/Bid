"use client";

import React, { useState } from "react";
import { 
  X, 
  Upload, 
  Clock, 
  MapPin, 
  IndianRupee, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "./UserContext";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CATEGORIES = [
  "Cycle",
  "Calculator",
  "Books",
  "Electronics",
  "Hostel",
  "Lab",
  "Sports",
  "Other",
];

const CONDITIONS = [
  "Brand New",
  "Like New",
  "Good",
  "Fair",
];

const PRESET_DURATIONS = [
  { label: "10 Mins (Test Anti-Sniping)", minutes: 10 },
  { label: "1 Hour", minutes: 60 },
  { label: "4 Hours", minutes: 240 },
  { label: "1 Day", minutes: 1440 },
  { label: "3 Days", minutes: 4320 },
];

const SAMPLE_PHOTO_PRESETS = [
  { label: "Cycle", url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80" },
  { label: "Calculator", url: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80" },
  { label: "Books", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80" },
  { label: "Electronics", url: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80" },
  { label: "Desk Lamp", url: "https://images.unsplash.com/photo-1534972195531-a756b1126f24?auto=format&fit=crop&w=800&q=80" },
];

export function CreateListingModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateListingModalProps) {
  const { currentUser } = useUser();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Cycle");
  const [condition, setCondition] = useState("Good");
  const [description, setDescription] = useState("");
  const [startingPrice, setStartingPrice] = useState("500");
  const [minIncrement, setMinIncrement] = useState("50");
  const [reservePrice, setReservePrice] = useState("");
  const [handoverLocation, setHandoverLocation] = useState(
    currentUser.hostel_block || "Hostel 3 Gate"
  );
  const [sellerNotes, setSellerNotes] = useState(
    "Available for quick handover right after final exams!"
  );
  const [imageUrl, setImageUrl] = useState(SAMPLE_PHOTO_PRESETS[0].url);
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const priceNum = parseFloat(startingPrice);
    const incNum = parseFloat(minIncrement);
    const reserveNum = reservePrice ? parseFloat(reservePrice) : priceNum;

    if (!title.trim()) {
      setErrorMsg("Please enter an item title.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 10) {
      setErrorMsg("Starting price must be at least ₹10.");
      return;
    }
    if (isNaN(incNum) || incNum < 10) {
      setErrorMsg("Minimum increment must be at least ₹10.");
      return;
    }

    setLoading(true);

    try {
      const startTime = new Date().toISOString();
      const endTime = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

      const { data, error } = await supabase.from("listings").insert({
        seller_id: currentUser.id,
        title: title.trim(),
        category,
        condition,
        description: description.trim() || `${condition} condition ${category} listed by ${currentUser.full_name}`,
        starting_price: priceNum,
        current_price: priceNum,
        min_bid_increment: incNum,
        reserve_price: reserveNum,
        start_time: startTime,
        end_time: endTime,
        handover_location: handoverLocation.trim() || "Campus Hostels",
        seller_notes: sellerNotes.trim(),
        images: [imageUrl.trim()],
        status: "active",
      }).select().single();

      if (error) {
        throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Listing creation error:", err);
      setErrorMsg(err.message || "Failed to create listing. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              List an Item for Fair Campus Bidding
            </h2>
            <p className="text-xs text-slate-500">
              Listing as <span className="font-bold text-slate-800">{currentUser.full_name}</span> ({currentUser.hostel_block})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Firefox 21-Speed Cycle / Casio FX-991EX Calculator"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>

          {/* Category & Condition */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const found = SAMPLE_PHOTO_PRESETS.find(p => p.label === e.target.value);
                  if (found) setImageUrl(found.url);
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
              >
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Starting Price & Min Increment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Starting Price (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  required
                  min="10"
                  step="10"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Minimum Bid Increment (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                <input
                  type="number"
                  required
                  min="10"
                  step="10"
                  value={minIncrement}
                  onChange={(e) => setMinIncrement(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Closing Duration Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Auction Duration *</span>
              <span className="text-[11px] font-normal text-slate-500 lowercase">
                Independent closing time per item
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_DURATIONS.map((dur) => {
                const isSelected = durationMinutes === dur.minutes;
                return (
                  <button
                    key={dur.minutes}
                    type="button"
                    onClick={() => setDurationMinutes(dur.minutes)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-bold text-center border transition-all ${
                      isSelected
                        ? "bg-red-50 text-red-600 border-red-400 shadow-2xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {dur.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Handover Location */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Campus Handover Spot *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Hostel 3 Mess Porch / Main Library Ground"
                value={handoverLocation}
                onChange={(e) => setHandoverLocation(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
              />
            </div>
          </div>

          {/* Image URL & Quick Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Photo URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white mb-2"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-500">
              <span className="shrink-0 font-medium">Quick Photos:</span>
              {SAMPLE_PHOTO_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setImageUrl(p.url)}
                  className="px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 font-medium"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description & Notes
            </label>
            <textarea
              rows={3}
              placeholder="Details on condition, purchase date, included accessories, or reasons for selling..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Publishing Auction...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Start Live Auction</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
