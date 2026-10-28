-- ============================================================================
-- CAMPUSBID SEED DATA
-- Migration: 02_seed.sql
-- Realistic campus marketplace seed data for testing anti-sniping, proxy bids,
-- live auction countdowns, Q&A, wishlist alerts, and handover flows.
-- ============================================================================

-- ============================================================================
-- 1. Create Supabase Auth Users
-- ============================================================================
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'rahul.sharma@campus.edu',
  crypt('password123', gen_salt('bf')),
  now() - INTERVAL '90 days',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Rahul Sharma", "role": "seller"}'::jsonb,
  now() - INTERVAL '90 days',
  now()
),
(
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'ananya.patel@campus.edu',
  crypt('password123', gen_salt('bf')),
  now() - INTERVAL '60 days',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Ananya Patel", "role": "buyer"}'::jsonb,
  now() - INTERVAL '60 days',
  now()
),
(
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'karthik.nair@campus.edu',
  crypt('password123', gen_salt('bf')),
  now() - INTERVAL '45 days',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Karthik Nair", "role": "buyer"}'::jsonb,
  now() - INTERVAL '45 days',
  now()
),
(
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'priya.singh@campus.edu',
  crypt('password123', gen_salt('bf')),
  now() - INTERVAL '120 days',
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Priya Singh", "role": "seller"}'::jsonb,
  now() - INTERVAL '120 days',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = now();

-- ============================================================================
-- 2. Upsert Student Profiles
-- 4 realistic students: 2 graduating seniors selling, 2 juniors buying
-- ============================================================================
INSERT INTO public.profiles (
  id, full_name, email, role, student_id, hostel_block, room_number,
  phone_number, avatar_url, rating, total_ratings
)
VALUES
(
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'Rahul Sharma',
  'rahul.sharma@campus.edu',
  'seller',
  'CS21B045',
  'Hostel 3 (Brahmaputra)',
  '214',
  '+91 98765 43210',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=256&q=80',
  4.92,
  19
),
(
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Ananya Patel',
  'ananya.patel@campus.edu',
  'buyer',
  'EE23B102',
  'Hostel 7 (Kaveri - Girls)',
  '102',
  '+91 98123 45678',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  5.00,
  6
),
(
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Karthik Nair',
  'karthik.nair@campus.edu',
  'buyer',
  'ME23B077',
  'Hostel 2 (Ganga)',
  '305',
  '+91 97654 32109',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
  4.85,
  11
),
(
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  'Priya Singh',
  'priya.singh@campus.edu',
  'seller',
  'CH21B018',
  'Hostel 8 (Godavari - Girls)',
  '412',
  '+91 99887 76655',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  4.96,
  27
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  student_id = EXCLUDED.student_id,
  hostel_block = EXCLUDED.hostel_block,
  room_number = EXCLUDED.room_number,
  phone_number = EXCLUDED.phone_number,
  avatar_url = EXCLUDED.avatar_url,
  rating = EXCLUDED.rating,
  total_ratings = EXCLUDED.total_ratings,
  updated_at = now();

-- ============================================================================
-- 3. Realistic Listings Across Campus Categories
-- Varied statuses: Active (closing in 10m, 2h, 1d), Ended (pending_approval), Completed (sold)
-- ============================================================================
INSERT INTO public.listings (
  id, seller_id, title, description, category, condition, images,
  starting_price, reserve_price, min_bid_increment, current_price,
  highest_bidder_id, status, start_time, end_time,
  handover_location, handover_status, handover_completed_at, seller_notes, view_count
)
VALUES
(
  -- 1. Cycle closing in 10 minutes (great for live countdown & anti-sniping testing)
  '11111111-aaaa-4000-8000-000000000001',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Rahul Sharma
  'Firefox Target 21-Speed Mountain Cycle (with helmet & wire lock)',
  'Firefox Target 26T 21-speed mountain bike in great condition. Dual disc brakes, front suspension, Shimano Tourney shifters. Serviced last month with new brake pads and chain lubricant. Graduating this week, giving away complimentary Decathlon helmet and 4-digit combination lock. Free test ride allowed outside Hostel 3!',
  'Cycle',
  'Good',
  ARRAY[
    'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=800&q=80'
  ],
  2800.00,
  3000.00,
  50.00,
  3500.00,
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair leading
  'active',
  now() - INTERVAL '2 days',
  now() + INTERVAL '10 minutes',
  'Hostel 3 Mess Porch / Cycle Stand',
  'pending',
  NULL,
  'Immediate handover available this evening after auction closure.',
  84
),
(
  -- 2. Casio scientific calculator closing in 2 hours
  '22222222-bbbb-4000-8000-000000000002',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', -- Priya Singh
  'Casio FX-991EX Classwiz Non-Programmable Scientific Calculator',
  'High-resolution Classwiz LCD natural textbook display. 552 functions including matrix/vector calculations, integration/differentiation, polynomial solver, and QR code generator. Approved for all midsem and endsem campus exams. Includes original hard sliding cover and quick formula cheat card.',
  'Calculator',
  'Like New',
  ARRAY[
    'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1611125832047-1d7ad1e8e48f?auto=format&fit=crop&w=800&q=80'
  ],
  600.00,
  700.00,
  20.00,
  850.00,
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel leading
  'active',
  now() - INTERVAL '1 day',
  now() + INTERVAL '2 hours',
  'Central Library Entrance or Hostel 8 Security Gate',
  'pending',
  NULL,
  'Will bring formula guide during handover.',
  52
),
(
  -- 3. Engineering Mathematics book closing in 1 day
  '33333333-cccc-4000-8000-000000000003',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Rahul Sharma
  'Higher Engineering Mathematics by B.S. Grewal (44th Edition)',
  'The quintessential engineering mathematics bible for 1st & 2nd year curriculum. Complete syllabus coverage: Ordinary & Partial Differential Equations, Transform Calculus, Linear Algebra, and Numerical Methods. Hardcover bound, crisp pages, zero torn leaves with light pencil notes in calculus sections.',
  'Books',
  'Good',
  ARRAY[
    'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80'
  ],
  300.00,
  350.00,
  20.00,
  420.00,
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair leading
  'active',
  now() - INTERVAL '3 days',
  now() + INTERVAL '1 day',
  'Department Lobby or Hostel 3 Common Room',
  'pending',
  NULL,
  'Extra semester tutorial sheets included as a gift.',
  39
),
(
  -- 4. Dell 24-inch monitor ended with winning bid awaiting seller approval
  '44444444-dddd-4000-8000-000000000004',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', -- Priya Singh
  'Dell 24-Inch IPS Full HD Monitor (SE2422H) - 75Hz Slim Bezel',
  'Ultra-slim bezel 1080p IPS display with AMD FreeSync, 75Hz refresh rate, tilt-adjustable stand, and anti-glare 3H coating. Perfect for dual-screen coding, design simulations, and gaming. Used carefully for 1 year with zero dead pixels. Includes Dell original HDMI cable and power cord.',
  'Electronics',
  'Like New',
  ARRAY[
    'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1586210579191-33b45e38fa2c?auto=format&fit=crop&w=800&q=80'
  ],
  4500.00,
  5500.00,
  100.00,
  6200.00,
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair winning bidder
  'pending_approval',
  now() - INTERVAL '4 days',
  now() - INTERVAL '30 minutes',
  'Hostel 8 Security Porch',
  'pending',
  NULL,
  'Winning bidder please coordinate handover time between 4-6 PM.',
  118
),
(
  -- 5. Study table lamp completed handover
  '55555555-eeee-4000-8000-000000000005',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Rahul Sharma
  'Wipro Re-chargeable LED Desk Study Lamp (Touch Dimming, 3 Color Modes)',
  'Eye-care LED lamp with flexible 360-degree goose neck and 2000mAh rechargeable lithium battery. 3 color temperatures (warm, daylight, cool white) with step-less touch dimming. Ideal for late-night exam prep without disturbing roommates. Lasts 5 hours on single charge.',
  'Hostel Essentials',
  'Good',
  ARRAY[
    'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=800&q=80'
  ],
  250.00,
  300.00,
  20.00,
  450.00,
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel
  'sold',
  now() - INTERVAL '6 days',
  now() - INTERVAL '3 days',
  'Hostel 3 Security Gate',
  'completed',
  now() - INTERVAL '2 days',
  'Handover completed successfully with Ananya Patel.',
  73
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  condition = EXCLUDED.condition,
  images = EXCLUDED.images,
  starting_price = EXCLUDED.starting_price,
  current_price = EXCLUDED.current_price,
  highest_bidder_id = EXCLUDED.highest_bidder_id,
  status = EXCLUDED.status,
  end_time = EXCLUDED.end_time,
  handover_location = EXCLUDED.handover_location,
  handover_status = EXCLUDED.handover_status,
  handover_completed_at = EXCLUDED.handover_completed_at,
  seller_notes = EXCLUDED.seller_notes,
  view_count = EXCLUDED.view_count,
  updated_at = now();

-- ============================================================================
-- 4. Bids History (Transparent records per listing)
-- ============================================================================
INSERT INTO public.bids (id, listing_id, bidder_id, amount, is_proxy_bid, max_proxy_amount, created_at)
VALUES
-- Bids on Listing 1 (Cycle)
('b1010000-0000-4000-8000-000000000001', '11111111-aaaa-4000-8000-000000000001', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 3000.00, false, NULL, now() - INTERVAL '1 day'),
('b1020000-0000-4000-8000-000000000002', '11111111-aaaa-4000-8000-000000000001', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 3200.00, false, NULL, now() - INTERVAL '18 hours'),
('b1030000-0000-4000-8000-000000000003', '11111111-aaaa-4000-8000-000000000001', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 3350.00, false, NULL, now() - INTERVAL '6 hours'),
('b1040000-0000-4000-8000-000000000004', '11111111-aaaa-4000-8000-000000000001', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 3500.00, true, 4000.00, now() - INTERVAL '45 minutes'),

-- Bids on Listing 2 (Calculator)
('b2010000-0000-4000-8000-000000000001', '22222222-bbbb-4000-8000-000000000002', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 650.00, false, NULL, now() - INTERVAL '20 hours'),
('b2020000-0000-4000-8000-000000000002', '22222222-bbbb-4000-8000-000000000002', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 720.00, false, NULL, now() - INTERVAL '14 hours'),
('b2030000-0000-4000-8000-000000000003', '22222222-bbbb-4000-8000-000000000002', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 780.00, false, NULL, now() - INTERVAL '5 hours'),
('b2040000-0000-4000-8000-000000000004', '22222222-bbbb-4000-8000-000000000002', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 850.00, true, 1000.00, now() - INTERVAL '1 hour'),

-- Bids on Listing 3 (Books)
('b3010000-0000-4000-8000-000000000001', '33333333-cccc-4000-8000-000000000003', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 340.00, false, NULL, now() - INTERVAL '2 days'),
('b3020000-0000-4000-8000-000000000002', '33333333-cccc-4000-8000-000000000003', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 380.00, false, NULL, now() - INTERVAL '1 day'),
('b3030000-0000-4000-8000-000000000003', '33333333-cccc-4000-8000-000000000003', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 400.00, false, NULL, now() - INTERVAL '16 hours'),
('b3040000-0000-4000-8000-000000000004', '33333333-cccc-4000-8000-000000000003', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 420.00, false, NULL, now() - INTERVAL '8 hours'),

-- Bids on Listing 4 (Dell Monitor - Ended Pending Approval)
('b4010000-0000-4000-8000-000000000001', '44444444-dddd-4000-8000-000000000004', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 4800.00, false, NULL, now() - INTERVAL '3 days'),
('b4020000-0000-4000-8000-000000000002', '44444444-dddd-4000-8000-000000000004', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 5200.00, false, NULL, now() - INTERVAL '2 days'),
('b4030000-0000-4000-8000-000000000003', '44444444-dddd-4000-8000-000000000004', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 5600.00, false, NULL, now() - INTERVAL '1 day'),
('b4040000-0000-4000-8000-000000000004', '44444444-dddd-4000-8000-000000000004', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 6000.00, false, NULL, now() - INTERVAL '4 hours'),
('b4050000-0000-4000-8000-000000000005', '44444444-dddd-4000-8000-000000000004', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 6200.00, false, NULL, now() - INTERVAL '40 minutes'),

-- Bids on Listing 5 (Desk Lamp - Handover Completed)
('b5010000-0000-4000-8000-000000000001', '55555555-eeee-4000-8000-000000000005', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 300.00, false, NULL, now() - INTERVAL '5 days'),
('b5020000-0000-4000-8000-000000000002', '55555555-eeee-4000-8000-000000000005', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 380.00, false, NULL, now() - INTERVAL '4 days'),
('b5030000-0000-4000-8000-000000000003', '55555555-eeee-4000-8000-000000000005', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', 420.00, false, NULL, now() - INTERVAL '3 days 6 hours'),
('b5040000-0000-4000-8000-000000000004', '55555555-eeee-4000-8000-000000000005', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 450.00, false, NULL, now() - INTERVAL '3 days 1 hour')
ON CONFLICT (id) DO NOTHING;

-- Link winning bids to listings
UPDATE public.listings SET winning_bid_id = 'b1040000-0000-4000-8000-000000000004' WHERE id = '11111111-aaaa-4000-8000-000000000001';
UPDATE public.listings SET winning_bid_id = 'b2040000-0000-4000-8000-000000000004' WHERE id = '22222222-bbbb-4000-8000-000000000002';
UPDATE public.listings SET winning_bid_id = 'b3040000-0000-4000-8000-000000000004' WHERE id = '33333333-cccc-4000-8000-000000000003';
UPDATE public.listings SET winning_bid_id = 'b4050000-0000-4000-8000-000000000005' WHERE id = '44444444-dddd-4000-8000-000000000004';
UPDATE public.listings SET winning_bid_id = 'b5040000-0000-4000-8000-000000000004' WHERE id = '55555555-eeee-4000-8000-000000000005';

-- ============================================================================
-- 5. Active Proxy Bids
-- ============================================================================
INSERT INTO public.proxy_bids (id, listing_id, bidder_id, max_amount, is_active)
VALUES
(
  'ba100000-0000-4000-8000-000000000001',
  '11111111-aaaa-4000-8000-000000000001',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair on Cycle
  4000.00,
  true
),
(
  'ba200000-0000-4000-8000-000000000002',
  '22222222-bbbb-4000-8000-000000000002',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel on Calculator
  1000.00,
  true
)
ON CONFLICT (listing_id, bidder_id) DO UPDATE SET
  max_amount = EXCLUDED.max_amount,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- ============================================================================
-- 6. Item Questions & Public Answers (Item Q&A)
-- ============================================================================
INSERT INTO public.questions (id, listing_id, user_id, question, answer, answered_at, created_at)
VALUES
(
  'fa101000-0000-4000-8000-000000000001',
  '11111111-aaaa-4000-8000-000000000001',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Are both gears working smoothly? Any chain slip during uphill pedaling to academic block?',
  'Shifters and Shimano derailleurs were tuned last month at the campus cycle hub. Shifts crisp and chain has zero slip.',
  now() - INTERVAL '1 day 2 hours',
  now() - INTERVAL '1 day 5 hours'
),
(
  'fa102000-0000-4000-8000-000000000002',
  '11111111-aaaa-4000-8000-000000000001',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Can I come for a quick test ride today evening near Hostel 3?',
  'Sure! I am outside Hostel 3 mess porch between 5:30 PM and 7:00 PM today.',
  now() - INTERVAL '14 hours',
  now() - INTERVAL '16 hours'
),
(
  'fa201000-0000-4000-8000-000000000001',
  '22222222-bbbb-4000-8000-000000000002',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Does it come with the original hard slide case and working battery?',
  'Yes! The original grey protective slide case is included with no scratches. Fresh battery replaced this semester, plus the solar panel works continuously.',
  now() - INTERVAL '18 hours',
  now() - INTERVAL '21 hours'
),
(
  'fa301000-0000-4000-8000-000000000001',
  '33333333-cccc-4000-8000-000000000003',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Does this 44th edition include the updated question papers with step-by-step solutions?',
  'Yes, it includes solved university papers at the end of each unit. All calculus formulas are neatly indexed.',
  now() - INTERVAL '1 day 12 hours',
  now() - INTERVAL '1 day 18 hours'
),
(
  'fa401000-0000-4000-8000-000000000001',
  '44444444-dddd-4000-8000-000000000004',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  'Does the monitor have any dead pixels or backlight bleed when watching dark videos?',
  'Zero dead pixels, tested on full black/white screen utility. Backlight is completely uniform with clear IPS viewing angles.',
  now() - INTERVAL '2 days',
  now() - INTERVAL '2 days 4 hours'
),
(
  'fa501000-0000-4000-8000-000000000001',
  '55555555-eeee-4000-8000-000000000005',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  'Can this lamp be used while plugged into a laptop USB port?',
  'Yes, it operates smoothly while plugged in via USB and also works independently on battery for 5 hours.',
  now() - INTERVAL '5 days',
  now() - INTERVAL '5 days 4 hours'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. Wishlist Alerts ("Never Miss What You Need")
-- ============================================================================
INSERT INTO public.wishlist_alerts (id, user_id, keyword, category, max_price, is_active)
VALUES
(
  'da101000-0000-4000-8000-000000000001',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel
  'Cycle',
  'Cycle',
  3500.00,
  true
),
(
  'da201000-0000-4000-8000-000000000002',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair
  'Monitor',
  'Electronics',
  6500.00,
  true
),
(
  'da301000-0000-4000-8000-000000000003',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel
  'Calculator',
  'Calculator',
  900.00,
  true
),
(
  'da401000-0000-4000-8000-000000000004',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair
  'Mathematics',
  'Books',
  450.00,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 8. Realistic Notifications
-- Outbid alerts, auction won, pending approval, handover confirmations
-- ============================================================================
INSERT INTO public.notifications (id, user_id, listing_id, type, title, message, is_read, metadata, created_at)
VALUES
(
  'ca101000-0000-4000-8000-000000000001',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel
  '11111111-aaaa-4000-8000-000000000001',
  'outbid',
  'You have been outbid on Firefox Target Cycle!',
  'Karthik Nair placed a higher bid of ₹3,500.00. The auction closes in under 10 minutes!',
  false,
  '{"listing_id": "11111111-aaaa-4000-8000-000000000001", "amount": 3500.00}'::jsonb,
  now() - INTERVAL '45 minutes'
),
(
  'ca201000-0000-4000-8000-000000000002',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair
  '22222222-bbbb-4000-8000-000000000002',
  'outbid',
  'You have been outbid on Casio Scientific Calculator!',
  'Ananya Patel placed a higher bid of ₹850.00. Place another bid before the auction ends in 2 hours!',
  false,
  '{"listing_id": "22222222-bbbb-4000-8000-000000000002", "amount": 850.00}'::jsonb,
  now() - INTERVAL '1 hour'
),
(
  'ca301000-0000-4000-8000-000000000003',
  'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', -- Priya Singh
  '44444444-dddd-4000-8000-000000000004',
  'auction_sold',
  'Auction Won: Awaiting your approval!',
  'Your listing "Dell 24-Inch IPS Full HD Monitor" was won with a highest bid of ₹6,200.00 by Karthik Nair. Please approve the sale and coordinate handover.',
  false,
  '{"listing_id": "44444444-dddd-4000-8000-000000000004", "winning_price": 6200.00, "winner_id": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"}'::jsonb,
  now() - INTERVAL '29 minutes'
),
(
  'ca401000-0000-4000-8000-000000000004',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- Karthik Nair
  '44444444-dddd-4000-8000-000000000004',
  'auction_won',
  'Congratulations! You won the Dell 24-inch Monitor!',
  'Your bid of ₹6,200.00 won the auction! Priya Singh will approve the sale and confirm the campus handover location.',
  false,
  '{"listing_id": "44444444-dddd-4000-8000-000000000004", "winning_price": 6200.00}'::jsonb,
  now() - INTERVAL '29 minutes'
),
(
  'ca501000-0000-4000-8000-000000000005',
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- Ananya Patel
  '55555555-eeee-4000-8000-000000000005',
  'handover_update',
  'Handover Completed Successfully!',
  'Handover for "Wipro Re-chargeable LED Desk Study Lamp" was confirmed by Rahul Sharma. Thank you for using CampusBid!',
  true,
  '{"listing_id": "55555555-eeee-4000-8000-000000000005", "handover_status": "completed"}'::jsonb,
  now() - INTERVAL '2 days'
),
(
  'ca601000-0000-4000-8000-000000000006',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- Rahul Sharma
  '11111111-aaaa-4000-8000-000000000001',
  'bid_placed',
  'New highest bid on Firefox Target Cycle!',
  'Karthik Nair placed a leading bid of ₹3,500.00 on your cycle.',
  false,
  '{"listing_id": "11111111-aaaa-4000-8000-000000000001", "amount": 3500.00}'::jsonb,
  now() - INTERVAL '45 minutes'
)
ON CONFLICT (id) DO NOTHING;
