"use client";

import React, { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { SellerDashboard } from "@/components/SellerDashboard";
import { CreateListingModal } from "@/components/CreateListingModal";
import { AuctionDetailModal } from "@/components/AuctionDetailModal";
import { WishlistModal } from "@/components/WishlistModal";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { AiAssistantDrawer } from "@/components/AiAssistantDrawer";

export default function SellerPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isWishlistModalOpen, setIsWishlistModalOpen] = useState(false);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      
      {/* Top Navigation Bar with activeTab="seller" */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        onOpenWishlistModal={() => setIsWishlistModalOpen(true)}
        onOpenNotificationDrawer={() => setIsNotificationDrawerOpen(true)}
        activeTab="seller"
      />

      {/* Main Seller Command Center */}
      <main className="flex-1">
        <SellerDashboard
          key={refreshKey}
          onOpenCreateListing={() => setIsCreateModalOpen(true)}
          onOpenDetailModal={(id) => setSelectedListingId(id)}
          onOpenAiDrawer={() => setIsAiDrawerOpen(true)}
        />
      </main>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setRefreshKey((k) => k + 1);
        }}
      />

      {/* Auction Detail Modal */}
      {selectedListingId && (
        <AuctionDetailModal
          isOpen={true}
          listingId={selectedListingId}
          onClose={() => setSelectedListingId(null)}
          onBidSuccess={() => {
            setRefreshKey((k) => k + 1);
          }}
          onListingUpdated={() => {
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Wishlist Alerts Modal */}
      <WishlistModal
        isOpen={isWishlistModalOpen}
        onClose={() => setIsWishlistModalOpen(false)}
      />

      {/* Real-time Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        onSelectListing={(id) => {
          setIsNotificationDrawerOpen(false);
          setSelectedListingId(id);
        }}
      />

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        onSelectListing={(id: string) => {
          setIsAiDrawerOpen(false);
          setSelectedListingId(id);
        }}
      />

    </div>
  );
}
