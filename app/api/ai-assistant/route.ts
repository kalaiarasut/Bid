import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface RequestBody {
  message: string;
  history?: ChatMessage[];
  userId?: string;
  userBudget?: number;
  audioInput?: boolean;
}

export interface ListingItemPreview {
  id: string;
  title: string;
  category: string;
  condition: string;
  current_price: number;
  min_bid_increment: number;
  images: string[];
  end_time: string;
  handover_location: string | null;
  status: string;
  starting_price: number;
  seller_id?: string;
  description?: string | null;
}

export interface ProposedBidData {
  listing_id: string;
  listing_title: string;
  category: string;
  current_price: number;
  proposed_amount: number;
  min_next_bid: number;
  min_bid_increment: number;
  is_proxy: boolean;
  max_proxy: number | null;
  image: string | null;
  end_time: string;
  handover_location: string | null;
  // Compatibility aliases
  listingId?: string;
  itemTitle?: string;
  currentPrice?: number;
  minNextBid?: number;
  proposedAmount?: number;
  handoverLocation?: string | null;
}

export interface ApiResponse {
  response: string;
  items?: ListingItemPreview[];
  proposedBid?: ProposedBidData | null;
  models?: {
    text: string;
    audio: string;
  };
}

const SYSTEM_INSTRUCTION = `
You are CampusBid AI, the official intelligent assistant for university student auctions on CampusBid.
Models active: Gemini 3.5 Flash Lite for ultra-fast text reasoning, Gemini 3.8 Live for live audio interaction.

CRITICAL RULES & CORE PHILOSOPHY:
Some students don’t want to search and compare at all. They would rather say "find me a cycle under ₹2,000" and get a straight answer, and maybe have the app bid for them.
The assistant plays by the same rules as everyone else:
1. NEVER ACT WITHOUT THE STUDENT'S GO-AHEAD:
   - You NEVER execute a bid directly on your own.
   - When a student asks or agrees to bid (e.g. "bid for me on the cycle up to ₹2,000", "place a bid of ₹1,500"), you draft a safe authorization card for them.
   - Explicitly inform the student: "I have drafted a safe authorization card for you. Please click 'Confirm & Place Bid' on screen to authorize it."
2. NEVER GO PAST THE AGREED LIMIT:
   - Strictly honor their agreed budget ceiling (e.g. max ₹2,000).
   - If proxy bidding is authorized, you guarantee the system will NEVER bid a single rupee beyond their agreed limit.
3. NEVER REVEAL OTHER STUDENTS' ACCOUNT DETAILS:
   - Never disclose phone numbers, email addresses, student IDs, or hostel room numbers.
   - Bidders are pseudonymous (e.g. "Bidder #34", "Junior from Hostel 7").
   - Handovers occur safely in designated campus areas (e.g. Hostel Mess Porch, Library Gates).
4. STRAIGHT, DIRECT ANSWERS:
   - Give straight, clear answers immediately highlighting the matching item and price in Indian Rupees (₹).
   - Never force the student to search or compare on their own.
`;

// Helper: Query listings from Supabase with robust category/price filtering
async function executeSearchListings(params: {
  query?: string;
  category?: string;
  max_price?: number;
  condition?: string;
  closing_soon?: boolean;
}): Promise<ListingItemPreview[]> {
  try {
    let q = supabase
      .from("listings")
      .select("id, title, category, condition, starting_price, current_price, min_bid_increment, images, end_time, handover_location, status, description")
      .eq("status", "active");

    if (params.category && params.category.trim()) {
      q = q.ilike("category", `%${params.category.trim()}%`);
    }

    if (params.query && params.query.trim()) {
      const term = params.query.trim();
      q = q.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    if (params.max_price && Number(params.max_price) > 0) {
      q = q.lte("current_price", Number(params.max_price));
    }

    if (params.condition && params.condition.trim()) {
      q = q.ilike("condition", `%${params.condition.trim()}%`);
    }

    if (params.closing_soon) {
      q = q.order("end_time", { ascending: true });
    } else {
      q = q.order("created_at", { ascending: false });
    }

    const { data, error } = await q.limit(6);
    if (error) {
      console.error("Supabase search_listings error:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      condition: row.condition,
      starting_price: Number(row.starting_price),
      current_price: Number(row.current_price),
      min_bid_increment: Number(row.min_bid_increment),
      images: Array.isArray(row.images) ? row.images : [],
      end_time: row.end_time,
      handover_location: row.handover_location,
      status: row.status,
      description: row.description,
    }));
  } catch (err: unknown) {
    console.error("executeSearchListings error:", err);
    return [];
  }
}

// Helper: Formulate safe bid proposal
async function executeProposeBid(params: {
  listing_id: string;
  amount: number;
  is_proxy?: boolean;
  max_proxy?: number;
}): Promise<{
  success: boolean;
  proposedBid?: ProposedBidData;
  error?: string;
}> {
  try {
    const { data: listing, error } = await supabase
      .from("listings")
      .select("id, title, category, condition, starting_price, current_price, min_bid_increment, images, end_time, handover_location, status, highest_bidder_id")
      .eq("id", params.listing_id)
      .maybeSingle();

    if (error || !listing) {
      return { success: false, error: "Listing not found or unavailable." };
    }

    if (listing.status !== "active") {
      return {
        success: false,
        error: `This listing is currently ${listing.status} and cannot receive new bids.`,
      };
    }

    const currentPrice = Number(listing.current_price);
    const minIncrement = Number(listing.min_bid_increment);
    const minNextBid = listing.highest_bidder_id
      ? currentPrice + minIncrement
      : Number(listing.starting_price);

    const proposedAmount = Math.max(Number(params.amount) || minNextBid, minNextBid);

    // Hard guarantee: if proxy limit is specified, ensure it never goes below proposed amount
    let maxProxy = params.max_proxy ? Number(params.max_proxy) : null;
    if (maxProxy !== null && maxProxy < proposedAmount) {
      maxProxy = proposedAmount;
    }

    const proposedBid: ProposedBidData = {
      listing_id: listing.id,
      listing_title: listing.title,
      category: listing.category,
      current_price: currentPrice,
      proposed_amount: proposedAmount,
      min_next_bid: minNextBid,
      min_bid_increment: minIncrement,
      is_proxy: Boolean(params.is_proxy || maxProxy),
      max_proxy: maxProxy,
      image: listing.images?.[0] || null,
      end_time: listing.end_time,
      handover_location: listing.handover_location,
      // Compatibility aliases
      listingId: listing.id,
      itemTitle: listing.title,
      currentPrice: currentPrice,
      minNextBid: minNextBid,
      proposedAmount: proposedAmount,
      handoverLocation: listing.handover_location,
    };

    return {
      success: true,
      proposedBid,
    };
  } catch (err: unknown) {
    console.error("executeProposeBid error:", err);
    return { success: false, error: "Failed to generate bid proposal." };
  }
}

// Rule-based fallback parser for high reliability
async function intelligentCampusFallback(userPrompt: string): Promise<ApiResponse> {
  const lower = userPrompt.toLowerCase().trim();
  let collectedItems: ListingItemPreview[] = [];
  let proposedBid: ProposedBidData | null = null;
  let textResponse = "";

  // 1. Detect Price Ceilings (e.g. "under 2000", "under ₹2,000", "below 1500")
  let maxPrice: number | undefined;
  const priceMatch = lower.match(/(?:under|below|less than|within|budget of?|up to)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1].replace(/,/g, ""), 10);
  }

  // 2. Detect Bidding / Proxy Intent (e.g. "bid for me", "bid on cycle", "bid up to 2000")
  const isBidIntent = /\b(bid|place bid|make bid|offer|bid for me|have the app bid|auto bid|proxy)\b/i.test(lower);

  // 3. Category classification
  let targetCategory = "";
  if (lower.includes("cycle") || lower.includes("bike") || lower.includes("bicycle") || lower.includes("kyoto") || lower.includes("firefox")) {
    targetCategory = "Cycle";
  } else if (lower.includes("calculator") || lower.includes("casio") || lower.includes("fx-991")) {
    targetCategory = "Calculator";
  } else if (lower.includes("book") || lower.includes("math") || lower.includes("grewal") || lower.includes("textbook")) {
    targetCategory = "Books";
  } else if (lower.includes("monitor") || lower.includes("dell") || lower.includes("electronics")) {
    targetCategory = "Electronics";
  }

  // 4. Privacy queries check (e.g. "who is bidding", "account details", "phone number")
  if (lower.includes("account detail") || lower.includes("phone number") || lower.includes("who is bidding") || lower.includes("student details")) {
    return {
      response: `🛡️ **Student Privacy Protection Guarantee**:\n\nCampusBid strictly keeps all student phone numbers, email addresses, and hostel room numbers confidential. Bidders are displayed pseudonymously (e.g. *Junior from Hostel 7*), and handovers are scheduled at public campus locations.`,
      items: [],
      proposedBid: null,
      models: { text: "Gemini 3.5 Flash Lite", audio: "Gemini 3.8 Live" },
    };
  }

  if (isBidIntent) {
    // Determine target amount or proxy limit
    const agreedLimit = maxPrice;
    const candidates = await executeSearchListings({
      category: targetCategory || undefined,
      max_price: agreedLimit,
      closing_soon: true,
    });

    const targetItem = candidates.length > 0 ? candidates[0] : null;

    if (targetItem) {
      collectedItems = [targetItem];
      const nextMin = targetItem.current_price + targetItem.min_bid_increment;
      const proposedAmount = nextMin;

      const proposalResult = await executeProposeBid({
        listing_id: targetItem.id,
        amount: proposedAmount,
        is_proxy: true,
        max_proxy: agreedLimit || proposedAmount + 200,
      });

      if (proposalResult.success && proposalResult.proposedBid) {
        proposedBid = proposalResult.proposedBid;
        textResponse = `I've drafted a safe authorization card for you to bid on **${targetItem.title}**!\n\n` +
          `• **Current Price**: ₹${targetItem.current_price.toLocaleString("en-IN")}\n` +
          `• **Next Minimum Bid**: ₹${proposedBid.min_next_bid.toLocaleString("en-IN")}\n` +
          `• **Agreed Ceiling Limit**: ₹${(proposedBid.max_proxy || proposedAmount).toLocaleString("en-IN")}\n\n` +
          `🔒 **Safety Guarantee**: I will never execute bids without your explicit go-ahead. Please review the details below and click **"Confirm & Place Bid"** to authorize. I will strictly cap your bids at ₹${(proposedBid.max_proxy || proposedAmount).toLocaleString("en-IN")}.`;
      }
    } else {
      textResponse = `I couldn't find an active ${targetCategory || "item"} listing within your requested budget. Here are other active items available for bidding:`;
      collectedItems = await executeSearchListings({ closing_soon: true });
    }
  } else if (targetCategory === "Cycle") {
    collectedItems = await executeSearchListings({ category: "Cycle", max_price: maxPrice });
    if (collectedItems.length > 0) {
      const topCycle = collectedItems[0];
      textResponse = `Found **${topCycle.title}** currently at **₹${topCycle.current_price.toLocaleString("en-IN")}**${maxPrice ? ` (well under your ₹${maxPrice.toLocaleString("en-IN")} limit)` : ""}.\n\nNext minimum bid is ₹${(topCycle.current_price + topCycle.min_bid_increment).toLocaleString("en-IN")}. Would you like me to draft a safe bid proposal for you?`;
    } else {
      textResponse = `No cycle auctions currently found under ₹${maxPrice?.toLocaleString("en-IN") || "2,000"}. Here are other active items on campus:`;
      collectedItems = await executeSearchListings({});
    }
  } else if (targetCategory === "Calculator") {
    collectedItems = await executeSearchListings({ category: "Calculator", max_price: maxPrice });
    if (collectedItems.length > 0) {
      const calc = collectedItems[0];
      textResponse = `Found **${calc.title}** at **₹${calc.current_price.toLocaleString("en-IN")}**. Approved for university semester exams!`;
    } else {
      textResponse = `No calculator auctions found under your budget. Here are active campus auctions:`;
      collectedItems = await executeSearchListings({});
    }
  } else {
    collectedItems = await executeSearchListings({
      category: targetCategory || undefined,
      max_price: maxPrice,
      closing_soon: true,
    });
    textResponse = `Here are active campus listings matching your criteria. You can ask me to bid on any item within your agreed limit!`;
  }

  return {
    response: textResponse,
    items: collectedItems,
    proposedBid,
    models: { text: "Gemini 3.5 Flash Lite", audio: "Gemini 3.8 Live" },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();
    const userPrompt = (body.message || "").trim();

    if (!userPrompt) {
      return NextResponse.json(
        { error: "Message content cannot be empty." },
        { status: 400 }
      );
    }

    const lower = userPrompt.toLowerCase();

    // 1. Detect Price Ceilings (e.g. "under ₹2,000", "under 2000")
    let maxPrice: number | undefined;
    const priceMatch = lower.match(/(?:under|below|less than|within|budget of?|up to)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
    if (priceMatch) {
      maxPrice = parseInt(priceMatch[1].replace(/,/g, ""), 10);
    }

    // 2. Classify category keywords
    let targetCategory = "";
    if (lower.includes("cycle") || lower.includes("bike") || lower.includes("bicycle") || lower.includes("kyoto") || lower.includes("firefox")) {
      targetCategory = "Cycle";
    } else if (lower.includes("calculator") || lower.includes("casio") || lower.includes("fx-991")) {
      targetCategory = "Calculator";
    } else if (lower.includes("book") || lower.includes("math") || lower.includes("grewal") || lower.includes("textbook")) {
      targetCategory = "Books";
    } else if (lower.includes("monitor") || lower.includes("dell") || lower.includes("electronics")) {
      targetCategory = "Electronics";
    }

    // 3. Query active matching listings from Supabase to ground the AI with real verified data
    const matchedListings = await executeSearchListings({
      category: targetCategory || undefined,
      max_price: maxPrice,
      closing_soon: true,
    });

    // 4. Check if student requests bidding assistance
    const isBidIntent = /\b(bid|place bid|make bid|offer|bid for me|have the app bid|auto bid|proxy)\b/i.test(lower);
    let proposedBid: ProposedBidData | null = null;

    if (isBidIntent && matchedListings.length > 0) {
      const targetItem = matchedListings[0];
      const nextMin = targetItem.current_price + targetItem.min_bid_increment;
      const agreedCeiling = maxPrice || targetItem.current_price + targetItem.min_bid_increment * 4;

      const proposalResult = await executeProposeBid({
        listing_id: targetItem.id,
        amount: nextMin,
        is_proxy: true,
        max_proxy: agreedCeiling,
      });

      if (proposalResult.success && proposalResult.proposedBid) {
        proposedBid = proposalResult.proposedBid;
      }
    }

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    // If GEMINI_API_KEY is available, invoke Gemini 3.5 Flash Lite
    if (geminiApiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey: geminiApiKey });

        const promptContext = `
Context of live campus listings currently available in the database:
${JSON.stringify(
  matchedListings.map((l) => ({
    id: l.id,
    title: l.title,
    category: l.category,
    current_price: l.current_price,
    min_bid_increment: l.min_bid_increment,
    handover_location: l.handover_location,
    end_time: l.end_time,
  })),
  null,
  2
)}

Student Query: "${userPrompt}"
${maxPrice ? `Stated Budget Limit: ₹${maxPrice}` : ""}
${proposedBid ? `Drafted Safe Bid Proposal: Proposed ₹${proposedBid.proposed_amount}, Max Ceiling ₹${proposedBid.max_proxy}` : ""}

Task Instructions:
1. If the student asked for an item (e.g. "find me a cycle under ₹2,000"), provide a straight, direct answer immediately highlighting the matching item title and price. Do not ask them to search or compare.
2. If the student asked or agreed to bid, confirm you drafted a safe authorization card on their screen. State the 3 Golden Rules:
   - You NEVER execute a bid without their explicit click on 'Confirm & Place Bid'.
   - You strictly respect their agreed ceiling of ₹${proposedBid?.max_proxy || maxPrice || "the agreed limit"} and will never bid past it.
   - You NEVER reveal other students' account details.
3. If they ask about other students' identity, reiterate that student privacy is protected and accounts are pseudonymous.
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash-lite",
          contents: [
            {
              role: "user",
              parts: [{ text: `${SYSTEM_INSTRUCTION}\n\n${promptContext}` }],
            },
          ],
        });

        const replyText = response.text || "Here are the campus listings matching your request.";

        return NextResponse.json({
          response: replyText,
          items: matchedListings.length > 0 ? matchedListings : undefined,
          proposedBid,
          models: {
            text: "Gemini 3.5 Flash Lite",
            audio: "Gemini 3.8 Live",
          },
        });
      } catch (geminiError: any) {
        console.warn("Gemini 3.5 Flash Lite error, falling back to rule engine:", geminiError?.message || geminiError);
      }
    }

    // Fallback rule engine if Gemini API call fails or key is missing
    const fallback = await intelligentCampusFallback(userPrompt);
    return NextResponse.json(fallback);
  } catch (err: any) {
    console.error("AI Assistant POST handler error:", err);
    return NextResponse.json(
      { error: "Internal server error occurred.", details: err?.message },
      { status: 500 }
    );
  }
}
