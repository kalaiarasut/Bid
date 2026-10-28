"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Gavel, 
  Search, 
  Sparkles, 
  PlusCircle, 
  Bell, 
  User, 
  ChevronDown, 
  Bookmark, 
  Star,
  CheckCircle2,
  LayoutDashboard
} from "lucide-react";
import { useUser, StudentProfile } from "./UserContext";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onOpenCreateModal: () => void;
  onOpenAiDrawer: () => void;
  onOpenWishlistModal: () => void;
  onOpenNotificationDrawer: () => void;
  activeTab?: "auctions" | "seller";
  onTabChange?: (tab: "auctions" | "seller") => void;
}

export function Navbar({
  searchQuery,
  onSearchChange,
  onOpenCreateModal,
  onOpenAiDrawer,
  onOpenWishlistModal,
  onOpenNotificationDrawer,
  activeTab = "auctions",
  onTabChange,
}: NavbarProps) {
  const { currentUser, allStudents, switchUser, unreadCount } = useUser();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-6 shrink-0">
            <Link 
              href="/"
              onClick={() => onTabChange && onTabChange("auctions")}
              className="flex items-center gap-2.5 group"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-600 text-white font-black text-lg shadow-xs group-hover:bg-red-700 transition-colors">
                CB
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 block leading-tight">
                  campus<span className="text-red-600">bid</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block -mt-0.5">
                  Fair Student Auctions
                </span>
              </div>
            </Link>

            {/* Navigation Switcher Tabs */}
            <nav className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-4">
              <Link
                href="/"
                onClick={(e) => {
                  if (onTabChange) {
                    e.preventDefault();
                    onTabChange("auctions");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === "auctions"
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                All Auctions
              </Link>
              <Link
                href="/seller"
                onClick={(e) => {
                  if (onTabChange) {
                    e.preventDefault();
                    onTabChange("seller");
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  activeTab === "seller"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Seller Dashboard</span>
              </Link>
            </nav>
          </div>

          {/* Search Bar with Ctrl+K shortcut cue (Hidden on Seller Dashboard) */}
          {activeTab !== "seller" && (
            <div className="flex-1 max-w-md mx-2">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cycles, calculators, books, hostel items..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-red-500 focus:bg-white focus:border-red-500 transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                />
                {searchQuery ? (
                  <button
                    onClick={() => onSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                ) : (
                  <span className="hidden sm:inline absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-200">
                    Ctrl K
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Never Miss / Wishlist Alerts (Hidden on Seller Dashboard) */}
            {activeTab !== "seller" && (
              <button
                onClick={onOpenWishlistModal}
                title="Never Miss What You Need (Wishlist Alerts)"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden lg:inline">Alerts</span>
              </button>
            )}

            {/* Notification Bell */}
            <button
              onClick={onOpenNotificationDrawer}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-red-600 rounded-full animate-pulse">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Log In Link */}
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 text-slate-800 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <User className="w-3.5 h-3.5" />
              <span>Log In</span>
            </Link>

            {/* Student Switcher Dropdown */}
            <div className="relative ml-1">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 transition-all text-left"
              >
                <img
                  src={currentUser.avatar_url || ""}
                  alt={currentUser.full_name}
                  className="w-7 h-7 rounded-full object-cover border border-slate-300 shrink-0"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1 leading-tight">
                    {currentUser.full_name}
                    <span className="text-[10px] font-semibold text-amber-600 flex items-center">
                      <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 inline mr-0.5" />
                      {currentUser.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 capitalize leading-tight">
                    {currentUser.role} • {currentUser.hostel_block?.split(" ")[0]}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Switch Active Student Profile
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Test live bidding & handover as different students
                      </div>
                    </div>

                    <div className="py-1">
                      {allStudents.map((student) => {
                        const isSelected = student.id === currentUser.id;
                        return (
                          <button
                            key={student.id}
                            onClick={() => {
                              switchUser(student.id);
                              setDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3.5 py-2 text-left hover:bg-slate-50 transition-colors ${
                              isSelected ? "bg-red-50/50" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={student.avatar_url || ""}
                                alt={student.full_name}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200"
                              />
                              <div>
                                <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                                  {student.full_name}
                                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                                    ({student.role})
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {student.hostel_block} • {student.room_number}
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
