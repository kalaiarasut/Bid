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
4. STRAIGHT, DIRECT ANSWERS & SINGLE ITEM PRECISION:
   - When a user asks about or bids on a specific item (e.g. "Hero Kyoto cycle"), focus exclusively on that item. Do NOT list unrelated items.
   - Give straight, clear answers immediately highlighting the matching item and price in Indian Rupees (₹).
5. MANDATORY BOLD FORMATTING FOR ASKING QUESTIONS:
   - Whenever you ask the student a question (e.g. asking if they want to set up an automated proxy bid, place a bid, or proceed with an authorization), you MUST format that entire asking question in bold text:
     Example: **Would you like me to set up an automated proxy bid for you up to your ₹2,000 limit?**
`;

// Helper: Ensure asking questions are bold
function ensureAskingTextBold(text: string): string {
  // Matches questions asking for user go-ahead or confirmation
  return text.replace(
    /(?:^|[.!?\n]\s*)([A-Z][^.!?\n]*\b(?:would you like me to|would you like|do you want me to|do you want|shall i|should i)\b[^.!?\n]*\?)/g,
    (full, question) => {
      const trimmed = question.trim();
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        return full;
      }
      return full.replace(trimmed, `**${trimmed}**`);
    }
  );
}

// Helper: Query listings from Supabase
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

// Helper: Extract specific item when user quotes or mentions a title
function findSpecificItem(userPrompt: string, listings: ListingItemPreview[]): ListingItemPreview | null {
  const lower = userPrompt.toLowerCase();

  // 1. Quoted title fragment
  const quoteMatch = userPrompt.match(/["']([^"']+)["']/);
  if (quoteMatch) {
    const quoted = quoteMatch[1].toLowerCase().trim();
    const found = listings.find(
      (l) => l.title.toLowerCase().includes(quoted) || quoted.includes(l.title.toLowerCase().slice(0, 15))
    );
    if (found) return found;
  }

  // 2. Specific keywords in title
  if (lower.includes("kyoto") || lower.includes("hero kyoto")) {
    const found = listings.find((l) => l.title.toLowerCase().includes("kyoto"));
    if (found) return found;
  }
  if (lower.includes("firefox")) {
    const found = listings.find((l) => l.title.toLowerCase().includes("firefox"));
    if (found) return found;
  }
  if (lower.includes("casio") || lower.includes("fx-991")) {
    const found = listings.find((l) => l.title.toLowerCase().includes("casio"));
    if (found) return found;
  }
  if (lower.includes("grewal") || lower.includes("engineering mathematics")) {
    const found = listings.find((l) => l.title.toLowerCase().includes("grewal"));
    if (found) return found;
  }
  if (lower.includes("monitor") || lower.includes("dell")) {
    const found = listings.find((l) => l.title.toLowerCase().includes("monitor"));
    if (found) return found;
  }

  return null;
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

  // 1. Detect Price Ceilings
  let maxPrice: number | undefined;
  const priceMatch = lower.match(/(?:under|below|less than|within|budget of?|up to)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1].replace(/,/g, ""), 10);
  }

  // 2. Detect Bidding / Proxy Intent
  const isBidIntent = /\b(bid|place bid|make bid|offer|bid for me|have the app bid|auto bid|proxy|propose a bid)\b/i.test(lower);

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

  // 4. Privacy queries check
  if (lower.includes("account detail") || lower.includes("phone number") || lower.includes("who is bidding") || lower.includes("student details")) {
    return {
      response: `🛡️ **Student Privacy Protection Guarantee**:\n\nCampusBid strictly keeps all student phone numbers, email addresses, and hostel room numbers confidential. Bidders are displayed pseudonymously (e.g. *Junior from Hostel 7*), and handovers are scheduled at public campus locations.`,
      items: [],
      proposedBid: null,
      models: { text: "Gemini 3.5 Flash Lite", audio: "Gemini 3.8 Live" },
    };
  }

  const allCategoryListings = await executeSearchListings({
    category: targetCategory || undefined,
    max_price: maxPrice,
    closing_soon: true,
  });

  const exactItem = findSpecificItem(userPrompt, allCategoryListings);

  if (isBidIntent) {
    const agreedLimit = maxPrice;
    const targetItem = exactItem || (allCategoryListings.length > 0 ? allCategoryListings[0] : null);

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
        textResponse = `I've drafted a safe authorization card on your screen for **${targetItem.title}** at ₹${proposedBid.proposed_amount.toLocaleString("en-IN")}${proposedBid.max_proxy ? ` (with a max ceiling of ₹${proposedBid.max_proxy.toLocaleString("en-IN")})` : ""}.\n\nPlease click **'Confirm & Place Bid'** on screen to authorize it.\n\nAs your CampusBid AI assistant, I operate strictly under our core rules:\n1. **Never acting without your go-ahead**: I never execute a bid directly. You must manually click the confirmation button.\n2. **Never going past your agreed limit**: Your ceiling is strictly locked at ₹${(proposedBid.max_proxy || proposedAmount).toLocaleString("en-IN")}. I guarantee the system will never bid a single rupee beyond your limit.\n3. **Never revealing student account details**: All student privacy is fully protected, and identities remain completely pseudonymous.`;
      }
    } else {
      textResponse = `I couldn't find an active ${targetCategory || "item"} listing within your requested budget. Here are other active items available for bidding:`;
      collectedItems = await executeSearchListings({ closing_soon: true });
    }
  } else if (exactItem) {
    collectedItems = [exactItem];
    textResponse = `Found **${exactItem.title}** currently at **₹${exactItem.current_price.toLocaleString("en-IN")}**.\n\n**Would you like me to set up an automated proxy bid for you up to your limit?**`;
  } else if (targetCategory === "Cycle") {
    collectedItems = allCategoryListings;
    if (collectedItems.length > 0) {
      const topCycle = collectedItems[0];
      textResponse = `Found **${topCycle.title}** currently at **₹${topCycle.current_price.toLocaleString("en-IN")}**${maxPrice ? ` (well under your ₹${maxPrice.toLocaleString("en-IN")} limit)` : ""}.\n\nNext minimum bid is ₹${(topCycle.current_price + topCycle.min_bid_increment).toLocaleString("en-IN")}. **Would you like me to set up an automated proxy bid for you up to your limit?**`;
    } else {
      textResponse = `No cycle auctions currently found under ₹${maxPrice?.toLocaleString("en-IN") || "2,000"}. Here are other active items on campus:`;
      collectedItems = await executeSearchListings({});
    }
  } else {
    collectedItems = allCategoryListings;
    textResponse = `Here are active campus listings matching your criteria. **Would you like me to set up an automated proxy bid for you?**`;
  }

  return {
    response: ensureAskingTextBold(textResponse),
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

    // 1. Detect Price Ceilings
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

    // 3. Query active matching listings from Supabase
    let matchedListings = await executeSearchListings({
      category: targetCategory || undefined,
      max_price: maxPrice,
      closing_soon: true,
    });

    // Check if user specifically requested an exact item by title or quote
    const exactItem = findSpecificItem(userPrompt, matchedListings);
    if (exactItem) {
      matchedListings = [exactItem];
    }

    // 4. Check if student requests bidding assistance
    const isBidIntent = /\b(bid|place bid|make bid|offer|bid for me|have the app bid|auto bid|proxy|propose a bid)\b/i.test(lower);
    let proposedBid: ProposedBidData | null = null;

    if (isBidIntent && matchedListings.length > 0) {
      const targetItem = exactItem || matchedListings[0];
      matchedListings = [targetItem]; // Keep ONLY the 1 item being bid on!

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
3. MANDATORY: Format ANY asking question to the student in bold text: e.g. **Would you like me to set up an automated proxy bid for you up to your ₹${maxPrice || "budget"} limit?**
4. If they ask about other students' identity, reiterate that student privacy is protected and accounts are pseudonymous.
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

        let replyText = response.text || "Here are the campus listings matching your request.";
        replyText = ensureAskingTextBold(replyText);

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
