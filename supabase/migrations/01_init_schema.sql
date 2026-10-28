-- ============================================================================
-- CAMPUSBID DATABASE SCHEMA INITIALIZATION
-- Migration: 01_init_schema.sql
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Profiles Table
-- Holds student profiles linked directly to Supabase auth.users
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'buyer', 'seller', 'admin')),
  student_id TEXT,
  hostel_block TEXT,
  room_number TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 0 AND rating <= 5.00),
  total_ratings INT NOT NULL DEFAULT 0 CHECK (total_ratings >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 3. Listings Table
-- Independent auctions for campus goods (cycles, calculators, books, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Good' CHECK (condition IN ('Brand New', 'Like New', 'Good', 'Fair', 'Heavily Used')),
  images TEXT[] NOT NULL DEFAULT '{}',
  starting_price NUMERIC(10, 2) NOT NULL CHECK (starting_price >= 0),
  reserve_price NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (reserve_price >= 0),
  min_bid_increment NUMERIC(10, 2) NOT NULL DEFAULT 10.00 CHECK (min_bid_increment > 0),
  current_price NUMERIC(10, 2) NOT NULL CHECK (current_price >= starting_price),
  highest_bidder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winning_bid_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'pending_approval', 'sold', 'rejected', 'cancelled', 'unsold')),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ NOT NULL,
  handover_location TEXT,
  handover_status TEXT NOT NULL DEFAULT 'pending' CHECK (handover_status IN ('pending', 'scheduled', 'completed', 'cancelled', 'failed_pickup')),
  handover_completed_at TIMESTAMPTZ,
  seller_notes TEXT,
  view_count INT NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_end_after_start CHECK (end_time > start_time)
);

-- ============================================================================
-- 4. Bids Table
-- Transparent public record of every bid placed with timestamps
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  is_proxy_bid BOOLEAN NOT NULL DEFAULT false,
  max_proxy_amount NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deferred foreign key constraint on listings.winning_bid_id
ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS fk_listings_winning_bid;

ALTER TABLE public.listings
  ADD CONSTRAINT fk_listings_winning_bid
  FOREIGN KEY (winning_bid_id) REFERENCES public.bids(id) ON DELETE SET NULL;

-- ============================================================================
-- 5. Proxy Bids Table
-- Configured auto-bidding ceiling per user per listing
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.proxy_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  max_amount NUMERIC(10, 2) NOT NULL CHECK (max_amount > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_proxy_bid_listing_bidder UNIQUE (listing_id, bidder_id)
);

-- ============================================================================
-- 6. Questions Table
-- Public Item Q&A before bidding
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT,
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 7. Wishlist Alerts Table
-- Watch preferences / triggers ("Never Miss What You Need")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wishlist_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  keyword TEXT,
  category TEXT,
  max_price NUMERIC(10, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 8. Notifications Table
-- Real-time in-app alerts (outbid, won, wishlist match, questions)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('outbid', 'bid_placed', 'auction_ending', 'auction_won', 'auction_sold', 'handover_update', 'wishlist_match', 'question_received', 'question_answered', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- 9. Performance Indexes
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_listings_seller ON public.listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON public.listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_end_time ON public.listings(end_time);
CREATE INDEX IF NOT EXISTS idx_listings_status_end_time ON public.listings(status, end_time);
CREATE INDEX IF NOT EXISTS idx_listings_highest_bidder ON public.listings(highest_bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_listing ON public.bids(listing_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_listing_amount ON public.bids(listing_id, amount DESC);
CREATE INDEX IF NOT EXISTS idx_proxy_bids_listing_active ON public.proxy_bids(listing_id, is_active);
CREATE INDEX IF NOT EXISTS idx_questions_listing ON public.questions(listing_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wishlist_alerts_user ON public.wishlist_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 10. Automatic Trigger for Supabase Auth Signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- ============================================================================
-- 11. Stored Procedure: place_bid_atomic
-- Implements atomic row-level locking, bid validation, anti-sniping extension,
-- and automated proxy bidding evaluation.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.place_bid_atomic(
  p_listing_id UUID,
  p_bidder_id UUID,
  p_amount NUMERIC,
  p_max_proxy_amount NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
  v_min_bid NUMERIC;
  v_remaining_seconds NUMERIC;
  v_new_end_time TIMESTAMPTZ;
  v_sniping_extended BOOLEAN := false;
  v_bid_id UUID;
  v_current_price NUMERIC;
  v_highest_bidder UUID;
  v_winning_bid_id UUID;
  v_prev_highest_bidder UUID;
  
  -- Proxy bidding variables
  v_other_proxy RECORD;
  v_counter_amount NUMERIC;
  v_user_proxy_max NUMERIC;
BEGIN
  -- 1. Atomic row lock on listing
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing % not found', p_listing_id;
  END IF;

  -- 2. Validate listing status and end time
  IF v_listing.status != 'active' THEN
    RAISE EXCEPTION 'Listing is not active (current status: %)', v_listing.status;
  END IF;

  IF v_listing.end_time <= now() THEN
    RAISE EXCEPTION 'Auction has already ended at %', v_listing.end_time;
  END IF;

  -- 3. Validate bidder identity
  IF v_listing.seller_id = p_bidder_id THEN
    RAISE EXCEPTION 'Seller cannot bid on their own listing';
  END IF;

  -- Calculate minimum required bid
  IF v_listing.highest_bidder_id IS NULL THEN
    v_min_bid := v_listing.starting_price;
  ELSE
    v_min_bid := v_listing.current_price + v_listing.min_bid_increment;
  END IF;

  -- Validate bid amount
  IF p_amount < v_min_bid THEN
    RAISE EXCEPTION 'Bid amount ₹% is less than minimum required bid ₹%', p_amount, v_min_bid;
  END IF;

  IF v_listing.highest_bidder_id = p_bidder_id AND p_max_proxy_amount IS NULL THEN
    RAISE EXCEPTION 'You are already the highest bidder at ₹%', v_listing.current_price;
  END IF;

  -- Validate proxy amount if provided
  IF p_max_proxy_amount IS NOT NULL AND p_max_proxy_amount < p_amount THEN
    RAISE EXCEPTION 'Maximum proxy amount (₹%) cannot be less than your bid amount (₹%)', p_max_proxy_amount, p_amount;
  END IF;

  -- 4. Anti-sniping extension check:
  -- If bid placed within last 30 seconds of auction, extend closing to now() + 60s
  v_remaining_seconds := EXTRACT(EPOCH FROM (v_listing.end_time - now()));
  IF v_remaining_seconds < 30 THEN
    v_new_end_time := now() + INTERVAL '60 seconds';
    v_sniping_extended := true;
  ELSE
    v_new_end_time := v_listing.end_time;
    v_sniping_extended := false;
  END IF;

  v_prev_highest_bidder := v_listing.highest_bidder_id;
  v_current_price := p_amount;
  v_highest_bidder := p_bidder_id;

  -- Record user's proxy setting if specified
  IF p_max_proxy_amount IS NOT NULL THEN
    v_user_proxy_max := p_max_proxy_amount;
    INSERT INTO public.proxy_bids (listing_id, bidder_id, max_amount, is_active, updated_at)
    VALUES (p_listing_id, p_bidder_id, p_max_proxy_amount, true, now())
    ON CONFLICT (listing_id, bidder_id)
    DO UPDATE SET max_amount = EXCLUDED.max_amount, is_active = true, updated_at = now();
  ELSE
    -- Check if user already had an active proxy
    SELECT max_amount INTO v_user_proxy_max
    FROM public.proxy_bids
    WHERE listing_id = p_listing_id AND bidder_id = p_bidder_id AND is_active = true;
  END IF;

  -- 5. Insert incoming bid
  INSERT INTO public.bids (listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount)
  VALUES (p_listing_id, p_bidder_id, p_amount, (p_max_proxy_amount IS NOT NULL), v_user_proxy_max)
  RETURNING id INTO v_bid_id;

  v_winning_bid_id := v_bid_id;

  -- Notify previous highest bidder if different
  IF v_prev_highest_bidder IS NOT NULL AND v_prev_highest_bidder != p_bidder_id THEN
    INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
    VALUES (
      v_prev_highest_bidder,
      p_listing_id,
      'outbid',
      'You have been outbid!',
      format('Someone placed a higher bid of ₹%s on "%s". Place another bid to stay in the lead!', p_amount, v_listing.title),
      jsonb_build_object('listing_id', p_listing_id, 'amount', p_amount, 'listing_title', v_listing.title)
    );
  END IF;

  -- 6. Evaluate Proxy Bidding from OTHER bidders
  -- Look for an active proxy bid from another bidder that can counter
  SELECT id, bidder_id, max_amount INTO v_other_proxy
  FROM public.proxy_bids
  WHERE listing_id = p_listing_id
    AND bidder_id != p_bidder_id
    AND is_active = true
    AND max_amount >= v_current_price + v_listing.min_bid_increment
  ORDER BY max_amount DESC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    -- Scenario A: Both current bidder and other bidder have proxy ceilings
    IF v_user_proxy_max IS NOT NULL AND v_user_proxy_max > v_current_price THEN
      IF v_user_proxy_max > v_other_proxy.max_amount THEN
        -- Current bidder wins the proxy duel!
        -- Insert exhausted proxy bid for other bidder at their ceiling
        INSERT INTO public.bids (listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount)
        VALUES (p_listing_id, v_other_proxy.bidder_id, v_other_proxy.max_amount, true, v_other_proxy.max_amount);

        UPDATE public.proxy_bids SET is_active = false, updated_at = now() WHERE id = v_other_proxy.id;

        -- Notification to other proxy bidder that they're outbid
        INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
        VALUES (
          v_other_proxy.bidder_id,
          p_listing_id,
          'outbid',
          'Your proxy ceiling was exceeded',
          format('Your maximum proxy bid of ₹%s for "%s" was surpassed.', v_other_proxy.max_amount, v_listing.title),
          jsonb_build_object('listing_id', p_listing_id, 'max_amount', v_other_proxy.max_amount)
        );

        -- Current bidder auto-bids enough to beat other proxy
        v_current_price := LEAST(v_user_proxy_max, v_other_proxy.max_amount + v_listing.min_bid_increment);
        v_highest_bidder := p_bidder_id;

        INSERT INTO public.bids (listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount)
        VALUES (p_listing_id, p_bidder_id, v_current_price, true, v_user_proxy_max)
        RETURNING id INTO v_winning_bid_id;

      ELSE
        -- Other proxy bidder has higher or equal ceiling and wins the duel!
        -- Insert bid for current bidder at their max if higher than current price
        IF v_user_proxy_max > v_current_price THEN
          INSERT INTO public.bids (listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount)
          VALUES (p_listing_id, p_bidder_id, v_user_proxy_max, true, v_user_proxy_max);
        END IF;

        -- Deactivate current bidder's proxy as it was reached/exceeded
        UPDATE public.proxy_bids SET is_active = false, updated_at = now()
        WHERE listing_id = p_listing_id AND bidder_id = p_bidder_id;

        -- Other bidder auto-counters to beat current bidder's max
        v_counter_amount := LEAST(v_other_proxy.max_amount, v_user_proxy_max + v_listing.min_bid_increment);
        v_current_price := v_counter_amount;
        v_highest_bidder := v_other_proxy.bidder_id;

        INSERT INTO public.bids (listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount)
        VALUES (p_listing_id, v_other_proxy.bidder_id, v_counter_amount, true, v_other_proxy.max_amount)
        RETURNING id INTO v_winning_bid_id;

        -- Notify current bidder
        INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
        VALUES (
          p_bidder_id,
          p_listing_id,
          'outbid',
          'Outbid by automated proxy bid!',
          format('An automated proxy bid countered with ₹%s on "%s".', v_counter_amount, v_listing.title),
          jsonb_build_object('listing_id', p_listing_id, 'amount', v_counter_amount)
        );
      END IF;

    ELSE
      -- Scenario B: Current bidder did NOT provide proxy (or has no higher proxy).
      -- Other proxy bidder automatically places incremental counter-bid!
      v_counter_amount := LEAST(v_other_proxy.max_amount, v_current_price + v_listing.min_bid_increment);
      v_current_price := v_counter_amount;
      v_highest_bidder := v_other_proxy.bidder_id;

      INSERT INTO public.bids (listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount)
      VALUES (p_listing_id, v_other_proxy.bidder_id, v_counter_amount, true, v_other_proxy.max_amount)
      RETURNING id INTO v_winning_bid_id;

      -- Notify current bidder
      INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
      VALUES (
        p_bidder_id,
        p_listing_id,
        'outbid',
        'Outbid by automated proxy bid!',
        format('An automated proxy bid immediately countered your bid with ₹%s on "%s".', v_counter_amount, v_listing.title),
        jsonb_build_object('listing_id', p_listing_id, 'amount', v_counter_amount)
      );
    END IF;
  ELSE
    -- Deactivate any other lower proxy bids for this listing that are now surpassed
    UPDATE public.proxy_bids
    SET is_active = false, updated_at = now()
    WHERE listing_id = p_listing_id
      AND is_active = true
      AND max_amount <= v_current_price;
  END IF;

  -- 7. Update Listing state
  UPDATE public.listings
  SET current_price = v_current_price,
      highest_bidder_id = v_highest_bidder,
      winning_bid_id = v_winning_bid_id,
      end_time = v_new_end_time,
      updated_at = now()
  WHERE id = p_listing_id;

  -- 8. Notify Seller of new bid
  INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
  VALUES (
    v_listing.seller_id,
    p_listing_id,
    'bid_placed',
    'New leading bid on your listing!',
    format('A bid of ₹%s is now leading on "%s".', v_current_price, v_listing.title),
    jsonb_build_object('listing_id', p_listing_id, 'amount', v_current_price, 'highest_bidder_id', v_highest_bidder)
  );

  RETURN jsonb_build_object(
    'success', true,
    'listing_id', p_listing_id,
    'current_price', v_current_price,
    'highest_bidder_id', v_highest_bidder,
    'winning_bid_id', v_winning_bid_id,
    'end_time', v_new_end_time,
    'sniping_extended', v_sniping_extended,
    'message', CASE 
      WHEN v_highest_bidder = p_bidder_id THEN 'Your bid was placed and is currently leading!'
      ELSE 'Your bid was recorded, but countered by an active proxy bid.'
    END
  );
END;
$$;

-- ============================================================================
-- 12. Trigger: Wishlist Alert Matching on Listing Insertion
-- Automatically evaluates saved alerts and delivers notifications to interested students
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_wishlist_alerts()
RETURNS TRIGGER AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT wa.id, wa.user_id, wa.keyword, wa.category, wa.max_price
    FROM public.wishlist_alerts wa
    WHERE wa.is_active = true
      AND wa.user_id != NEW.seller_id
      AND (wa.category IS NULL OR LOWER(wa.category) = LOWER(NEW.category))
      AND (
        wa.keyword IS NULL
        OR wa.keyword = ''
        OR NEW.title ILIKE '%' || wa.keyword || '%'
        OR NEW.description ILIKE '%' || wa.keyword || '%'
      )
      AND (wa.max_price IS NULL OR NEW.starting_price <= wa.max_price)
  LOOP
    INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
    VALUES (
      r.user_id,
      NEW.id,
      'wishlist_match',
      'Wishlist Alert: Item Available!',
      format('A new listing "%s" matches your wishlist query for ₹%s in %s.', NEW.title, NEW.starting_price, NEW.category),
      jsonb_build_object(
        'listing_id', NEW.id,
        'alert_id', r.id,
        'keyword', r.keyword,
        'category', NEW.category,
        'starting_price', NEW.starting_price
      )
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_wishlist_alerts') THEN
    CREATE TRIGGER trg_check_wishlist_alerts
      AFTER INSERT ON public.listings
      FOR EACH ROW
      EXECUTE FUNCTION public.check_wishlist_alerts();
  END IF;
END $$;

-- ============================================================================
-- 13. Stored Procedure: resolve_closing_auctions
-- Finds expired active auctions and moves them to pending_approval / unsold,
-- notifying both buyers and sellers.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.resolve_closing_auctions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count INT := 0;
  v_new_status TEXT;
  v_resolved_ids UUID[] := '{}';
BEGIN
  FOR r IN
    SELECT l.*
    FROM public.listings l
    WHERE l.status = 'active'
      AND l.end_time <= now()
    FOR UPDATE SKIP LOCKED
  LOOP
    IF r.highest_bidder_id IS NOT NULL THEN
      -- Check reserve price
      IF r.reserve_price > 0 AND r.current_price < r.reserve_price THEN
        v_new_status := 'unsold';

        -- Notify Seller
        INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
        VALUES (
          r.seller_id,
          r.id,
          'auction_ending',
          'Auction ended: Reserve price not met',
          format('Your auction for "%s" ended with top bid ₹%s, which did not meet your reserve price of ₹%s.', r.title, r.current_price, r.reserve_price),
          jsonb_build_object('listing_id', r.id, 'status', 'unsold', 'final_price', r.current_price)
        );

        -- Notify Highest Bidder
        INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
        VALUES (
          r.highest_bidder_id,
          r.id,
          'auction_ending',
          'Auction ended: Reserve not reached',
          format('The auction for "%s" ended. Your bid of ₹%s did not meet the seller reserve price.', r.title, r.current_price),
          jsonb_build_object('listing_id', r.id, 'status', 'unsold', 'bid_amount', r.current_price)
        );
      ELSE
        v_new_status := 'pending_approval';

        -- Notify Seller for Approval
        INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
        VALUES (
          r.seller_id,
          r.id,
          'auction_sold',
          'Auction Won: Awaiting your approval!',
          format('Your listing "%s" was won with a highest bid of ₹%s. Please approve and schedule campus handover.', r.title, r.current_price),
          jsonb_build_object('listing_id', r.id, 'status', 'pending_approval', 'winning_price', r.current_price, 'winner_id', r.highest_bidder_id)
        );

        -- Notify Winning Bidder
        INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
        VALUES (
          r.highest_bidder_id,
          r.id,
          'auction_won',
          'Congratulations! You won the auction!',
          format('You have won the auction for "%s" at ₹%s! Awaiting seller handover confirmation.', r.title, r.current_price),
          jsonb_build_object('listing_id', r.id, 'status', 'pending_approval', 'winning_price', r.current_price)
        );
      END IF;
    ELSE
      v_new_status := 'unsold';

      -- Notify Seller
      INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
      VALUES (
        r.seller_id,
        r.id,
        'auction_ending',
        'Auction ended with no bids',
        format('Your listing "%s" has closed without any bids. You may edit or relist it anytime.', r.title),
        jsonb_build_object('listing_id', r.id, 'status', 'unsold')
      );
    END IF;

    UPDATE public.listings
    SET status = v_new_status,
        updated_at = now()
    WHERE id = r.id;

    v_count := v_count + 1;
    v_resolved_ids := array_append(v_resolved_ids, r.id);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'resolved_count', v_count,
    'resolved_listing_ids', v_resolved_ids
  );
END;
$$;

-- ============================================================================
-- 14. Seller Approval and Handover Helper Procedures
-- ============================================================================
CREATE OR REPLACE FUNCTION public.seller_resolve_auction(
  p_listing_id UUID,
  p_seller_id UUID,
  p_approve BOOLEAN,
  p_handover_location TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
BEGIN
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing % not found', p_listing_id;
  END IF;

  IF v_listing.seller_id != p_seller_id THEN
    RAISE EXCEPTION 'Only the seller can resolve this auction';
  END IF;

  IF v_listing.status != 'pending_approval' THEN
    RAISE EXCEPTION 'Listing is not in pending_approval status (current: %)', v_listing.status;
  END IF;

  IF p_approve THEN
    UPDATE public.listings
    SET status = 'sold',
        handover_status = 'scheduled',
        handover_location = COALESCE(p_handover_location, v_listing.handover_location),
        seller_notes = COALESCE(p_notes, v_listing.seller_notes),
        updated_at = now()
    WHERE id = p_listing_id;

    IF v_listing.highest_bidder_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
      VALUES (
        v_listing.highest_bidder_id,
        p_listing_id,
        'handover_update',
        'Sale Approved! Ready for Handover',
        format('The seller approved your winning bid for "%s". Handover location: %s.', v_listing.title, COALESCE(p_handover_location, 'Campus location')),
        jsonb_build_object('listing_id', p_listing_id, 'location', p_handover_location)
      );
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'sold', 'handover_status', 'scheduled');
  ELSE
    UPDATE public.listings
    SET status = 'rejected',
        handover_status = 'cancelled',
        seller_notes = COALESCE(p_notes, v_listing.seller_notes),
        updated_at = now()
    WHERE id = p_listing_id;

    IF v_listing.highest_bidder_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
      VALUES (
        v_listing.highest_bidder_id,
        p_listing_id,
        'auction_ending',
        'Sale Rejected by Seller',
        format('The seller declined to fulfill the auction for "%s".', v_listing.title),
        jsonb_build_object('listing_id', p_listing_id, 'status', 'rejected')
      );
    END IF;

    RETURN jsonb_build_object('success', true, 'status', 'rejected', 'handover_status', 'cancelled');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_handover(
  p_listing_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing public.listings%ROWTYPE;
BEGIN
  SELECT * INTO v_listing
  FROM public.listings
  WHERE id = p_listing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing % not found', p_listing_id;
  END IF;

  IF v_listing.seller_id != p_user_id AND v_listing.highest_bidder_id != p_user_id THEN
    RAISE EXCEPTION 'Only the seller or buyer can confirm handover';
  END IF;

  UPDATE public.listings
  SET handover_status = 'completed',
      handover_completed_at = now(),
      status = 'sold',
      updated_at = now()
  WHERE id = p_listing_id;

  INSERT INTO public.notifications (user_id, listing_id, type, title, message, metadata)
  VALUES (
    CASE WHEN p_user_id = v_listing.seller_id THEN v_listing.highest_bidder_id ELSE v_listing.seller_id END,
    p_listing_id,
    'handover_update',
    'Handover Completed Successfully!',
    format('Handover for "%s" was confirmed. Thank you for trading on CampusBid!', v_listing.title),
    jsonb_build_object('listing_id', p_listing_id, 'handover_status', 'completed')
  );

  RETURN jsonb_build_object('success', true, 'handover_status', 'completed');
END;
$$;

-- ============================================================================
-- 15. Realtime Publication Setup
-- Enable Supabase Realtime for live bids, countdowns, questions, and alerts
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

ALTER TABLE public.listings REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;
ALTER TABLE public.questions REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- ============================================================================
-- 16. Row Level Security (RLS) Policies
-- Public transparency for bids/listings; protected user actions
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Listings Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Listings are viewable by everyone') THEN
    CREATE POLICY "Listings are viewable by everyone" ON public.listings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Authenticated users can create listings') THEN
    CREATE POLICY "Authenticated users can create listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'listings' AND policyname = 'Sellers can update their own listings') THEN
    CREATE POLICY "Sellers can update their own listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
  END IF;
END $$;

-- Bids Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bids' AND policyname = 'Bids are viewable by everyone') THEN
    CREATE POLICY "Bids are viewable by everyone" ON public.bids FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bids' AND policyname = 'Authenticated users can insert bids') THEN
    CREATE POLICY "Authenticated users can insert bids" ON public.bids FOR INSERT TO authenticated WITH CHECK (auth.uid() = bidder_id);
  END IF;
END $$;

-- Proxy Bids Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proxy_bids' AND policyname = 'Users can view their own proxy bids') THEN
    CREATE POLICY "Users can view their own proxy bids" ON public.proxy_bids FOR SELECT TO authenticated USING (auth.uid() = bidder_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'proxy_bids' AND policyname = 'Users can manage their own proxy bids') THEN
    CREATE POLICY "Users can manage their own proxy bids" ON public.proxy_bids FOR ALL TO authenticated USING (auth.uid() = bidder_id) WITH CHECK (auth.uid() = bidder_id);
  END IF;
END $$;

-- Questions Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'Questions are viewable by everyone') THEN
    CREATE POLICY "Questions are viewable by everyone" ON public.questions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'Authenticated users can ask questions') THEN
    CREATE POLICY "Authenticated users can ask questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'questions' AND policyname = 'Sellers can answer questions') THEN
    CREATE POLICY "Sellers can answer questions" ON public.questions FOR UPDATE TO authenticated USING (
      EXISTS (SELECT 1 FROM public.listings WHERE listings.id = questions.listing_id AND listings.seller_id = auth.uid())
      OR auth.uid() = user_id
    );
  END IF;
END $$;

-- Wishlist Alerts Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wishlist_alerts' AND policyname = 'Users can manage their own wishlist alerts') THEN
    CREATE POLICY "Users can manage their own wishlist alerts" ON public.wishlist_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Notifications Policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can view their own notifications') THEN
    CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND policyname = 'Users can update their own notifications') THEN
    CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
