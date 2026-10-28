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
  Dumbbell, 
  Sparkles,
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
  { id: "Cycle", label: "Cycles", icon: Bike },
  { id: "Calculator", label: "Calculators", icon: Calculator },
  { id: "Books", label: "Books & Notes", icon: BookOpen },
  { id: "Electronics", label: "Electronics", icon: Laptop },
  { id: "Hostel", label: "Hostel Essentials", icon: Bed },
  { id: "Lab", label: "Lab Equipment", icon: FlaskConical },
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
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -200 : 200;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="relative border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative flex items-center">
        
        {/* Left Scroll Button */}
        <button
          onClick={() => scroll("left")}
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors z-10 shrink-0 mr-1"
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Categories Strip */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar scroll-smooth w-full"
        >
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            const count = categoryCounts[cat.id];

            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                  isSelected
                    ? "bg-red-50 text-red-600 border border-red-300 shadow-2xs font-bold"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-red-600" : "text-slate-500"}`} />
                <span>{cat.label}</span>
                {count !== undefined && count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
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
          className="hidden sm:flex items-center justify-center w-7 h-7 rounded-full bg-white border border-slate-200 shadow-2xs text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors z-10 shrink-0 ml-1"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

      </div>
    </div>
  );
}
