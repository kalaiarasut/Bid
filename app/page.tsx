"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Gavel, 
  Search, 
  Clock, 
  ChevronRight, 
  Filter, 
  Sparkles, 
  ArrowUpDown,
  RefreshCcw,
  PlusCircle,
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/components/UserContext";
import { Navbar } from "@/components/Navbar";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { FilterSidebar, FilterState } from "@/components/FilterSidebar";
import { AuctionCard, AuctionItem } from "@/components/AuctionCard";
import { AuctionDetailModal } from "@/components/AuctionDetailModal";
import { CreateListingModal } from "@/components/CreateListingModal";
import { WishlistModal } from "@/components/WishlistModal";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { AiAssistantDrawer } from "@/components/AiAssistantDrawer";
import { SellerDashboard } from "@/components/SellerDashboard";

export default function HomePage() {
  const { currentUser } = useUser();

  const [listings, setListings] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Drawers State
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    condition: [],
    minPrice: "",
    maxPrice: "",
    urgency: "all",
    location: "",
  });
  const [sortBy, setSortBy] = useState<string>("closing_soon");
  const [activeTab, setActiveTab] = useState<"auctions" | "seller">("auctions");

  // Fetch listings from Supabase
  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from("listings")
        .select(`
          id,
          seller_id,
          title,
          category,
          description,
          condition,
          images,
          starting_price,
          reserve_price,
          min_bid_increment,
          current_price,
          highest_bidder_id,
          status,
          start_time,
          end_time,
          handover_location,
          handover_status,
          view_count,
          winning_bid_id,
          seller:seller_id (
            full_name,
            rating
          ),
          highest_bidder:highest_bidder_id (
            full_name
          )
        `)
        .order("end_time", { ascending: true });

      if (error) {
        console.error("Error fetching listings:", error);
        return;
      }

      if (data) {
        // Also fetch bid counts per listing
        const { data: bidsData } = await supabase
          .from("bids")
          .select("listing_id");

        const countsMap: Record<string, number> = {};
        if (bidsData) {
          bidsData.forEach((b) => {
            countsMap[b.listing_id] = (countsMap[b.listing_id] || 0) + 1;
          });
        }

        const formatted: AuctionItem[] = data.map((item: any) => ({
          id: item.id,
          seller_id: item.seller_id,
          title: item.title,
          category: item.category,
          description: item.description,
          condition: item.condition,
          images: item.images || [],
          starting_price: Number(item.starting_price),
          reserve_price: Number(item.reserve_price),
          min_bid_increment: Number(item.min_bid_increment),
          current_price: Number(item.current_price),
          highest_bidder_id: item.highest_bidder_id,
          status: item.status,
          start_time: item.start_time,
          end_time: item.end_time,
          handover_location: item.handover_location,
          handover_status: item.handover_status,
          seller_name: item.seller?.full_name,
          seller_rating: item.seller?.rating,
          highest_bidder_name: item.highest_bidder?.full_name,
          bids_count: countsMap[item.id] || 0,
        }));

        setListings(formatted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Supabase Realtime Subscription for instantaneous updates
  useEffect(() => {
    const channel = supabase
      .channel("home-listings-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "listings" },
        () => {
          fetchListings();
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids" },
        () => {
          fetchListings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Sync Category Carousel with Filters
  const handleSelectCategory = (cat: string) => {
    setSelectedCategory(cat);
    setFilters((prev) => ({ ...prev, category: cat }));
  };

  // Compute Counts for Badges
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = { all: listings.length };
    listings.forEach((item) => {
      map[item.category] = (map[item.category] || 0) + 1;
    });
    return map;
  }, [listings]);

  const conditionCounts = useMemo(() => {
    const map: Record<string, number> = {};
    listings.forEach((item) => {
      map[item.condition] = (map[item.condition] || 0) + 1;
    });
    return map;
  }, [listings]);

  // Filtered & Sorted Items
  const filteredListings = useMemo(() => {
    return listings
      .filter((item) => {
        // Keyword Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchDesc = item.description?.toLowerCase().includes(q);
          const matchCat = item.category.toLowerCase().includes(q);
          const matchLoc = item.handover_location?.toLowerCase().includes(q);
          if (!matchTitle && !matchDesc && !matchCat && !matchLoc) {
            return false;
          }
        }

        // Category
        if (filters.category !== "all") {
          const itemCat = item.category.toLowerCase();
          const filterCat = filters.category.toLowerCase();
          if (itemCat !== filterCat && !itemCat.includes(filterCat) && !filterCat.includes(itemCat)) {
            return false;
          }
        }

        // Condition
        if (filters.condition.length > 0) {
          if (!filters.condition.includes(item.condition)) {
            return false;
          }
        }

        // Price Range
        if (filters.minPrice && item.current_price < parseFloat(filters.minPrice)) {
          return false;
        }
        if (filters.maxPrice && item.current_price > parseFloat(filters.maxPrice)) {
          return false;
        }

        // Urgency / Status
        const now = Date.now();
        const end = new Date(item.end_time).getTime();
        const diffMinutes = (end - now) / (1000 * 60);

        if (filters.urgency === "closing_soon") {
          if (item.status !== "active" || diffMinutes <= 0 || diffMinutes > 60) {
            return false;
          }
        } else if (filters.urgency === "active") {
          if (item.status !== "active" || diffMinutes <= 0) {
            return false;
          }
        } else if (filters.urgency === "ended") {
          if (item.status === "active" && diffMinutes > 0) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.end_time).getTime();
        const timeB = new Date(b.end_time).getTime();

        if (sortBy === "closing_soon") {
          return timeA - timeB;
        } else if (sortBy === "price_asc") {
          return a.current_price - b.current_price;
        } else if (sortBy === "price_desc") {
          return b.current_price - a.current_price;
        } else if (sortBy === "most_bids") {
          return (b.bids_count || 0) - (a.bids_count || 0);
        } else if (sortBy === "newest") {
          return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
        }
        return 0;
      });
  }, [listings, searchQuery, filters, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        onOpenWishlistModal={() => setIsWishlistModalOpen(true)}
        onOpenNotificationDrawer={() => setIsNotificationDrawerOpen(true)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
      />

      {activeTab === "seller" ? (
        <main className="flex-1 w-full">
          <SellerDashboard
            onOpenCreateListing={() => setIsCreateModalOpen(true)}
            onOpenDetailModal={(id) => setSelectedListingId(id)}
            onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
          />
        </main>
      ) : (
        <>
          {/* Category Carousel Strip */}
          <CategoryCarousel
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            categoryCounts={categoryCounts}
          />

          {/* Main Two-Column Auction Layout */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              
              {/* Left Column: Filter Sidebar */}
              <FilterSidebar
                filters={filters}
                onFilterChange={setFilters}
                onResetFilters={() => {
                  setFilters({
                    category: "all",
                    condition: [],
                    minPrice: "",
                    maxPrice: "",
                    urgency: "all",
                    location: "",
                  });
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                categoryCounts={categoryCounts}
                conditionCounts={conditionCounts}
                totalCount={filteredListings.length}
              />

              {/* Right Column: Auction Feed */}
              <div className="flex-1 w-full space-y-4">
                
                {/* Top Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div>
                    <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span>Campus Auctions</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                        {filteredListings.length} items
                      </span>
                    </h1>
                    <p className="text-[11px] text-slate-500">
                      Fair bidding • Automatic anti-sniping (+60s under 30s) • Public transparent history
                    </p>
                  </div>

                  {/* Sort Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">
                      Sort:
                    </span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-red-500"
                    >
                      <option value="closing_soon">Closing Soonest</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                      <option value="most_bids">Most Bids</option>
                      <option value="newest">Newest Listed</option>
                    </select>
                  </div>
                </div>

                {/* Auction Cards Grid */}
                {loading ? (
                  <div className="py-24 text-center space-y-3">
                    <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <div className="text-xs font-medium text-slate-500">
                      Loading verified campus auctions...
                    </div>
                  </div>
                ) : filteredListings.length === 0 ? (
                  <div className="py-20 text-center bg-white rounded-xl border border-dashed border-slate-300 p-8 space-y-3">
                    <Gavel className="w-10 h-10 text-slate-300 mx-auto" />
                    <div className="text-sm font-bold text-slate-700">
                      No auctions matched your filters
                    </div>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Try adjusting your price range, condition, or search keyword, or clear all filters to see all campus items.
                    </p>
                    <button
                      onClick={() => {
                        setFilters({
                          category: "all",
                          condition: [],
                          minPrice: "",
                          maxPrice: "",
                          urgency: "all",
                          location: "",
                        });
                        setSelectedCategory("all");
                        setSearchQuery("");
                      }}
                      className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors inline-flex items-center gap-1.5"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredListings.map((item) => (
                      <AuctionCard
                        key={item.id}
                        item={item}
                        onSelect={(it) => setSelectedListingId(it.id)}
                        currentUserId={currentUser.id}
                      />
                    ))}
                  </div>
                )}

              </div>

            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">CampusBid</span>
            <span>•</span>
            <span>Fair Student Auction Marketplace</span>
          </div>
          <div className="text-center sm:text-right text-[11px] text-slate-400">
            PostgreSQL Atomic Locking • Real-Time Anti-Sniping • Gemini AI Assistant
          </div>
        </div>
      </footer>

      {/* Modals & Slide-over Drawers */}
      {selectedListingId && (
        <AuctionDetailModal
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
          onBidSuccess={() => {
            fetchListings();
          }}
        />
      )}

      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchListings();
        }}
      />

      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onSelectListing={(id: string) => setSelectedListingId(id)}
      />

      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onOpen={() => setIsAiDrawerOpen(true)}
        onClose={() => setIsAiDrawerOpen(false)}
        onSelectListing={(id: string) => setSelectedListingId(id)}
      />

    </div>
  );
}
