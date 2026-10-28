"use client";

import React from "react";
import { 
  Gavel, 
  Bike, 
  Calculator, 
  BookOpen, 
  Laptop, 
  Bed, 
  FlaskConical, 
  Dumbbell 
} from "lucide-react";

export interface CategoryItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
}

export const CATEGORIES: CategoryItem[] = [
  { id: "all", label: "All Auctions", shortLabel: "All Items", icon: Gavel },
  { id: "Cycle", label: "Cycles & Mobility", shortLabel: "Cycles", icon: Bike },
  { id: "Calculator", label: "Calculators & Tech", shortLabel: "Calculators", icon: Calculator },
  { id: "Books", label: "Books & Notes", shortLabel: "Books", icon: BookOpen },
  { id: "Electronics", label: "Electronics & Gadgets", shortLabel: "Electronics", icon: Laptop },
  { id: "Hostel Essentials", label: "Hostel Essentials", shortLabel: "Hostel Gear", icon: Bed },
  { id: "Lab", label: "Lab & Drawing", shortLabel: "Lab Tools", icon: FlaskConical },
  { id: "Sports", label: "Sports & Fitness", shortLabel: "Sports", icon: Dumbbell },
];

interface CategoryCarouselProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
}

export function CategoryCarousel({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
}: CategoryCarouselProps) {
  return (
    <section className="border-b border-slate-200 bg-white shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        
        {/* Responsive Grid of Category Cards (No Scrollbars, Zero Clipping) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected =
              selectedCategory === cat.id ||
              (selectedCategory !== "all" &&
                (cat.id.toLowerCase().includes(selectedCategory.toLowerCase()) ||
                  selectedCategory.toLowerCase().includes(cat.id.toLowerCase())));

            // Lookup count handling exact or partial match
            const count =
              categoryCounts[cat.id] ??
              categoryCounts[cat.shortLabel || ""] ??
              (cat.id === "Hostel Essentials" ? categoryCounts["Hostel"] : undefined);

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex flex-col justify-between p-2.5 sm:p-3 rounded-xl border text-left transition-all group relative cursor-pointer ${
                  isSelected
                    ? "bg-red-50/80 border-red-500 shadow-xs ring-1 ring-red-500/20"
                    : "bg-slate-50/60 hover:bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                }`}
              >
                {/* Top Row: Icon + Count Badge */}
                <div className="flex items-center justify-between w-full mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-red-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-500 group-hover:text-slate-800 group-hover:border-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </div>

                  {count !== undefined && count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                        isSelected
                          ? "bg-red-600 text-white"
                          : "bg-slate-200/80 text-slate-600 group-hover:bg-slate-200"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </div>

                {/* Bottom Row: Category Title */}
                <div>
                  <span
                    className={`block text-xs font-semibold leading-tight transition-colors line-clamp-1 ${
                      isSelected
                        ? "text-red-700 font-bold"
                        : "text-slate-700 group-hover:text-slate-900"
                    }`}
                    title={cat.label}
                  >
                    {cat.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal hidden lg:block">
                    {cat.id === "all" ? "Campus wide" : "Verified item"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
