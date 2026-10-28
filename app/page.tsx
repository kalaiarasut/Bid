import React from "react";
import { 
  Gavel, 
  Search, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Filter, 
  Sparkles, 
  Bike, 
  Calculator, 
  BookOpen, 
  Laptop, 
  FlaskConical, 
  Bed, 
  Dumbbell,
  ArrowUpDown
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const SAMPLE_AUCTIONS = [
  {
    id: "1",
    title: "Hercules Roadeo Hardliner 21-Speed Cycle",
    category: "Cycles",
    location: "Hostel 7, West Campus",
    imageUrl: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80",
    currentBid: 2450,
    startingPrice: 1500,
    bidsCount: 14,
    endsIn: "ENDS IN 45M",
    urgent: true,
  },
  {
    id: "2",
    title: "Casio fx-991EX ClassWiz Advanced Scientific Calculator",
    category: "Calculators",
    location: "Hostel 3, North Campus",
    imageUrl: "https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80",
    currentBid: 620,
    startingPrice: 300,
    bidsCount: 8,
    endsIn: "ENDS TODAY",
    urgent: false,
  },
  {
    id: "3",
    title: "Core Engineering Textbooks Bundle (Vol 1-4)",
    category: "Books",
    location: "Hostel 12, South Campus",
    imageUrl: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    currentBid: 480,
    startingPrice: 200,
    bidsCount: 6,
    endsIn: "ENDS IN 2H",
    urgent: false,
  },
  {
    id: "4",
    title: "Dell 24\" IPS 75Hz Monitor (with HDMI & power cord)",
    category: "Electronics",
    location: "Hostel 4, East Campus",
    imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
    currentBid: 4100,
    startingPrice: 2500,
    bidsCount: 19,
    endsIn: "ENDS TODAY",
    urgent: false,
  },
];

const CATEGORIES = [
  { name: "All Auctions", icon: Gavel },
  { name: "Cycles", icon: Bike },
  { name: "Calculators", icon: Calculator },
  { name: "Books & Notes", icon: BookOpen },
  { name: "Electronics", icon: Laptop },
  { name: "Lab Equipment", icon: FlaskConical },
  { name: "Hostel Furniture", icon: Bed },
  { name: "Sports & Fitness", icon: Dumbbell },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-sm font-black text-xl tracking-tighter">
                CB
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight leading-none">
                  campus<span className="text-red-600">bid</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  Fair Student Auctions
                </span>
              </div>
            </div>

            {/* Quick Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-6">
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cycles, calculators, books, hostel items..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 hover:bg-slate-50 focus:bg-white text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            {/* Right Nav */}
            <nav className="flex items-center gap-3">
              <button className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md transition-colors">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                AI Assistant
              </button>
              <button className="px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
                List Item
              </button>
              <button className="btn-bid-solid text-xs px-3.5 py-1.5 font-medium">
                Student Sign In
              </button>
            </nav>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
              <button className="p-1 rounded text-slate-400 hover:text-slate-600 shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 shrink-0">
                {CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.name}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                        idx === 0
                          ? "bg-red-50 border-red-200 text-red-700 font-semibold"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
              <button className="p-1 rounded text-slate-400 hover:text-slate-600 shrink-0">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="text-xs text-slate-500 font-medium mb-1">
              Campus Auctions &rsaquo; West &amp; North Hostels &rsaquo; Ending Soon
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              All Active Auctions
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Verified campus listings &bull; 100% transparent bidding history &bull; Last-minute anti-sniping enabled
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-subtle">
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
            <button className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 shadow-subtle">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Closing Soonest
            </button>
          </div>
        </div>

        {/* Auction Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SAMPLE_AUCTIONS.map((item) => (
            <div key={item.id} className="auction-card group">
              {/* Image Container with Badge */}
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 left-2.5">
                  <span
                    className={
                      item.urgent ? "badge-timer-urgent" : "badge-timer"
                    }
                  >
                    <Clock className="w-3 h-3" />
                    {item.endsIn}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex flex-col flex-1 justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {item.category} &bull; {item.location}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-red-600 transition-colors">
                    {item.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xs text-slate-500">Current Bid</span>
                    <span className="text-xs font-medium text-slate-500">
                      {item.bidsCount} bids
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 tracking-tight mb-3">
                    {formatCurrency(item.currentBid)}
                  </div>

                  <button className="btn-bid w-full group-hover:bg-red-600 group-hover:text-white transition-colors">
                    Bid Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p className="font-semibold text-slate-700">CampusBid &bull; Fair-Bidding Auction Marketplace</p>
          <p className="mt-1">Connecting graduating seniors with juniors for fair, verified on-campus item handovers.</p>
        </div>
      </footer>
    </div>
  );
}
