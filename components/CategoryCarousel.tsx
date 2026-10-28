"use client";

import React, { useRef } from "react";
import { 
  Gavel, 
  Bike, 
  Calculator, 
  BookOpen, 
  Laptop, 
  Bed, 
  FlaskConical, 
  Dumbbell, 
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export interface CategoryItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

export const CATEGORIES: CategoryItem[] = [
  { id: "all", label: "All Auctions", icon: Gavel },
  { id: "Cycle", label: "Cycles & Mobility", icon: Bike },
  { id: "Calculator", label: "Calculators & Tech", icon: Calculator },
  { id: "Books", label: "Books & Notes", icon: BookOpen },
  { id: "Electronics", label: "Electronics & Gadgets", icon: Laptop },
  { id: "Hostel", label: "Hostel Essentials", icon: Bed },
  { id: "Lab", label: "Lab & Drawing Tools", icon: FlaskConical },
  { id: "Sports", label: "Sports & Fitness", icon: Dumbbell },
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
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -240 : 240;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="border-b border-slate-200 bg-white shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center py-2.5">
        
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll("left")}
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors z-10 shrink-0 mr-2"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Categories Strip */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar scroll-smooth w-full"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id];

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 border ${
                  isSelected
                    ? "bg-red-50 text-red-600 border-red-300 shadow-2xs font-bold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isSelected ? "text-red-600" : "text-slate-500"}`} />
                <span>{cat.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? "bg-red-600 text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          onClick={() => scroll("right")}
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors z-10 shrink-0 ml-2"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
