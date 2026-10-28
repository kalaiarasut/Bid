"use client";

import React from "react";
import { Filter, X, Clock, Check, ChevronDown, RefreshCcw, Search } from "lucide-react";

export interface FilterState {
  category: string;
  condition: string[];
  minPrice: string;
  maxPrice: string;
  urgency: "all" | "closing_soon" | "active" | "ended";
  location: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  categoryCounts?: Record<string, number>;
  conditionCounts?: Record<string, number>;
  totalCount: number;
}

const CONDITIONS = ["Brand New", "Like New", "Good", "Fair"];

const HOSTEL_REGIONS = [
  "Hostel 2 (Ganga)",
  "Hostel 3 (Brahmaputra)",
  "Hostel 7 (Kaveri - Girls)",
  "Hostel 8 (Godavari - Girls)",
];

export function FilterSidebar({
  filters,
  onFilterChange,
  onResetFilters,
  categoryCounts = {},
  conditionCounts = {},
  totalCount,
}: FilterSidebarProps) {
  const hasActiveFilters =
    filters.category !== "all" ||
    filters.condition.length > 0 ||
    filters.minPrice !== "" ||
    filters.maxPrice !== "" ||
    filters.urgency !== "all" ||
    filters.location !== "";

  const toggleCondition = (cond: string) => {
    const exists = filters.condition.includes(cond);
    const updated = exists
      ? filters.condition.filter((c) => c !== cond)
      : [...filters.condition, cond];
    onFilterChange({ ...filters, condition: updated });
  };

  return (
    <div className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-5">
      
      {/* Top Header & Active Filter Bar (Matching bidadoo reference) */}
      <div className="space-y-3 pb-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-800">
            <Filter className="w-3.5 h-3.5 text-slate-700" />
            <span>Filters</span>
            <span className="text-slate-400 font-semibold">({totalCount})</span>
          </div>
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {filters.category !== "all" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                {filters.category}
                <button
                  onClick={() => onFilterChange({ ...filters, category: "all" })}
                  className="hover:text-red-600 ml-0.5 text-xs font-bold"
                >
                  ✕
                </button>
              </span>
            )}
            {filters.condition.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200"
              >
                {c}
                <button
                  onClick={() => toggleCondition(c)}
                  className="hover:text-red-600 ml-0.5 text-xs font-bold"
                >
                  ✕
                </button>
              </span>
            ))}
            {filters.urgency === "closing_soon" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                Closing Soon
                <button
                  onClick={() => onFilterChange({ ...filters, urgency: "all" })}
                  className="hover:text-red-900 ml-0.5 text-xs font-bold"
                >
                  ✕
                </button>
              </span>
            )}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                ₹{filters.minPrice || "0"} - ₹{filters.maxPrice || "Max"}
                <button
                  onClick={() => onFilterChange({ ...filters, minPrice: "", maxPrice: "" })}
                  className="hover:text-red-600 ml-0.5 text-xs font-bold"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Buying Format / Auction Status */}
      <div className="space-y-2 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            Buying Format
          </span>
          {filters.urgency !== "all" && (
            <button
              onClick={() => onFilterChange({ ...filters, urgency: "all" })}
              className="text-[10px] font-bold text-red-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1">
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-0.5 hover:text-slate-900">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === "all"}
              onChange={() => onFilterChange({ ...filters, urgency: "all" })}
              className="w-3.5 h-3.5 text-red-600 accent-red-600"
            />
            <span className="font-semibold">All Items</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-0.5 hover:text-slate-900">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === "closing_soon"}
              onChange={() => onFilterChange({ ...filters, urgency: "closing_soon" })}
              className="w-3.5 h-3.5 text-red-600 accent-red-600"
            />
            <span className="font-semibold text-red-600">Closing Soon (&lt; 1 hour)</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-0.5 hover:text-slate-900">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === "active"}
              onChange={() => onFilterChange({ ...filters, urgency: "active" })}
              className="w-3.5 h-3.5 text-red-600 accent-red-600"
            />
            <span>Active Bidding</span>
          </label>
          <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none py-0.5 hover:text-slate-900">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === "ended"}
              onChange={() => onFilterChange({ ...filters, urgency: "ended" })}
              className="w-3.5 h-3.5 text-red-600 accent-red-600"
            />
            <span>Ended / Handover</span>
          </label>
        </div>
      </div>

      {/* Condition Checklist */}
      <div className="space-y-2 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            Condition
          </span>
          {filters.condition.length > 0 && (
            <button
              onClick={() => onFilterChange({ ...filters, condition: [] })}
              className="text-[10px] font-bold text-red-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="space-y-1">
          {CONDITIONS.map((cond) => {
            const isChecked = filters.condition.includes(cond);
            const count = conditionCounts[cond] || 0;
            return (
              <label
                key={cond}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-0.5"
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCondition(cond)}
                    className="w-3.5 h-3.5 rounded-xs border-slate-300 text-red-600 focus:ring-red-500 accent-red-600"
                  />
                  <span>{cond}</span>
                </div>
                {count > 0 && (
                  <span className="text-[11px] text-slate-400">({count})</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-2 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">
            Price Range (₹)
          </span>
          {(filters.minPrice || filters.maxPrice) && (
            <button
              onClick={() => onFilterChange({ ...filters, minPrice: "", maxPrice: "" })}
              className="text-[10px] font-bold text-red-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
            className="w-1/2 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white font-medium"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
            className="w-1/2 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white font-medium"
          />
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {["500", "1500", "3000", "5000"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onFilterChange({ ...filters, maxPrice: p })}
              className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              &lt; ₹{p}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
