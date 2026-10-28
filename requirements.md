# Campus Fair-Bidding Auction Marketplace — Requirements & Specifications

## 1. The Story & Context
It’s the last day of the final semester exams. Seniors are packing up, leaving behind cycles, calculators, and books. Most of them leave campus within a week. Juniors need exactly those things, but today they’re sold through chat groups where the fastest person wins, and the price is a guess.

**Mission:** Build the place where campus competes fairly for them, and every item finds its next owner.

---

## 2. Core Basics (Foundational Requirements)
*Every implementation must satisfy these fundamentals first.*

### 2.1 Listings
- **Independent Auctions:** Each item is its own standalone auction.
- **Seller Input Fields:**
  - Title
  - Category (e.g., Cycle, Calculator, Books, Electronics, etc.)
  - Description
  - Condition (e.g., Brand New, Like New, Good, Fair, Heavily Used)
  - Photos / Image URLs
  - Starting Price (₹)
  - Minimum Bid Increment (₹)
  - Closing Date & Time (independent closing times per item)
- **Lifecycle Management:** A seller can edit or cancel a listing before closing or under specified conditions.

### 2.2 Browsing & Discovery
- **Search & Filter:**
  - Search by keywords
  - Filter by Category, Condition, Price range, and "Closing Soon"
- **Auction Detail View:**
  - Item details & media
  - Current leading bid
  - Full transparent bid history (bidder, amount, timestamp)
  - Dynamic live countdown timer

### 2.3 Bidding System
- **Bid Validation:**
  - First bid must be at least the starting price.
  - Subsequent bids must be at least `Current Leading Bid + Minimum Increment`.
  - No bids accepted after auction closure.
- **Transparency & Integrity:**
  - Every bid is recorded with bidder identifier, amount, and exact timestamp.
  - All bids and proxy maximums are public; nothing about bidding is private or opaque.

### 2.4 Closing, Resolution & Sale Handover
- **Closing Logic:**
  - When an item's closing time expires, bidding is locked immediately.
  - Highest valid bid becomes the provisional winner.
  - If no bids are placed, the item is marked as unsold (eligible for relisting).
- **Seller Resolution:**
  - Seller can approve or reject the winning provisional price.
  - Approval reserves the item for the winner.
  - Confirmed campus handover completes the sale.
  - Outcomes recorded with audit trail: Handover Completed, Rejected by Seller, Seller Cancellation, or Failed Pickup.

### 2.5 Real-time Alerts & Notifications
- Instant alerts for outbidding, auction won, auction ended, question answered, and handover updates.
- Support for Web/Browser notifications (background tab alerts via Notifications API).

---

## 3. Key Advanced Features
*Building upon the foundational platform.*

### 3.1 AI Assistant Tab
- Natural language interface for conversational discovery (e.g., *"find me a cycle under ₹2,000"*).
- Straightforward answers and actionable recommendations.
- Optional assisted bidding on behalf of the student:
  - Strict guardrails: Never acts without explicit student go-ahead / confirmation.
  - Never exceeds pre-agreed limits or thresholds.
  - Privacy compliance: Never exposes other students' private or account data.

### 3.2 Questions Before Bidding (Item Q&A / FAQ)
- Dedicated Q&A section on each auction page.
- Buyers can ask targeted condition queries (e.g., brake condition, screen fading, page marks).
- Sellers can answer questions publicly so repetitive inquiries are eliminated and spam is prevented.

### 3.3 "Never Miss What You Need" (Saved Alerts / Wishlist Triggers)
- Students can define watch preferences/queries (e.g., *"scientific calculator, up to ₹400"*).
- Automated notifications when a matching item is listed, ensuring students don't miss deals during class or sleep.

### 3.4 Last-Minute Anti-Sniping Extensions
- Dynamic closing extension: If a valid bid arrives within the last 30 seconds of an auction, the closing time extends to 60 seconds after that bid.
- Live countdown sync across all viewers in real-time.

### 3.5 Automatic Bidding (Proxy Bidding)
- Buyers can set a maximum proxy ceiling (e.g., ₹1,800).
- The system automatically places incremental bids on the student's behalf only as much as needed to maintain lead position up to their maximum ceiling.

---

## 4. Development & Source Control Guidelines
- Git repository with clear, sequential commits reflecting feature-by-feature progress.
- Public GitHub repository integration.
