"use client";

import React from "react";
import { Filter, X, Clock, Check, ChevronDown, RefreshCcw } from "lucide-react";

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
    <div className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-6">
      
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-700" />
          <span className="text-sm font-bold text-slate-900">Filters</span>
          <span className="text-xs font-medium text-slate-500">({totalCount})</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
          >
            <RefreshCcw className="w-3 h-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 pb-3 border-b border-slate-100">
          {filters.category !== "all" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
              {filters.category}
              <button
                onClick={() => onFilterChange({ ...filters, category: "all" })}
                className="hover:text-red-900"
              >
                ×
              </button>
            </span>
          )}
          {filters.condition.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
            >
              {c}
              <button
                onClick={() => toggleCondition(c)}
                className="hover:text-slate-900"
              >
                ×
              </button>
            </span>
          ))}
          {filters.urgency === "closing_soon" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
              ⚡ Closing Soon
              <button
                onClick={() => onFilterChange({ ...filters, urgency: "all" })}
                className="hover:text-amber-900"
              >
                ×
              </button>
            </span>
          )}
          {(filters.minPrice || filters.maxPrice) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              ₹{filters.minPrice || "0"} - ₹{filters.maxPrice || "Any"}
              <button
                onClick={() => onFilterChange({ ...filters, minPrice: "", maxPrice: "" })}
                className="hover:text-slate-900"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}

      {/* Urgency / Closing Soon */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Auction Status
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onFilterChange({ ...filters, urgency: "all" })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              filters.urgency === "all"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, urgency: "closing_soon" })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all flex items-center justify-center gap-1 ${
              filters.urgency === "closing_soon"
                ? "bg-red-600 text-white border-red-600"
                : "bg-white text-red-600 border-red-200 hover:bg-red-50"
            }`}
          >
            <Clock className="w-3 h-3" />
            Closing Soon
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, urgency: "active" })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              filters.urgency === "active"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Active
          </button>
          <button
            onClick={() => onFilterChange({ ...filters, urgency: "ended" })}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-center transition-all ${
              filters.urgency === "ended"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            Ended/Sold
          </button>
        </div>
      </div>

      {/* Condition Checklist */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Item Condition
        </label>
        <div className="space-y-1.5">
          {CONDITIONS.map((cond) => {
            const isChecked = filters.condition.includes(cond);
            const count = conditionCounts[cond] || 0;
            return (
              <label
                key={cond}
                className="flex items-center justify-between text-xs text-slate-700 hover:text-slate-900 cursor-pointer select-none py-1 px-1 rounded-sm hover:bg-slate-50"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCondition(cond)}
                    className="w-4 h-4 rounded-sm border-slate-300 text-red-600 focus:ring-red-500 accent-red-600"
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
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
          Price Range (₹)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={(e) => onFilterChange({ ...filters, minPrice: e.target.value })}
            className="w-1/2 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
          />
          <span className="text-slate-400 text-xs">to</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={(e) => onFilterChange({ ...filters, maxPrice: e.target.value })}
            className="w-1/2 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-red-500 focus:bg-white"
          />
        </div>
        <div className="flex flex-wrap gap-1 pt-1">
          {["500", "1500", "3000", "5000"].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onFilterChange({ ...filters, maxPrice: p })}
              className="text-[10px] font-medium px-2 py-0.5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              Under ₹{p}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
