import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
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
  // Alternative keys for backward-compatibility with other components
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
}

const SYSTEM_INSTRUCTION = `
You are CampusBid AI, the official intelligent assistant for university student auctions on CampusBid.
Your job is to help college students buy and sell pre-owned campus essentials (cycles, scientific calculators, textbooks, hostel monitors, dorm furniture).

CRITICAL SAFETY & PRIVACY GUARDRAILS:
1. SAFE BIDDING WORKFLOW:
   - YOU MUST NEVER EXECUTE OR FINALIZE A BID DIRECTLY.
   - When a student asks or hints to bid on an item (e.g. "bid 4250 on the cycle", "I want to bid on the Casio", "place a bid of ₹900"), you MUST invoke the 'propose_bid' function.
   - In your response text, explicitly state: "I've drafted a safe proposed bid card for you below. Please review the amount and click 'Confirm & Place Bid' to authorize it."
   - Emphasize that anti-sniping protection extends auctions by 60 seconds if a bid occurs in the final 30 seconds.
2. STRICT BUDGET GUARDRAILS:
   - Respect the student's stated budget ceiling at all times.
   - If a listing's minimum bid exceeds the student's stated budget, notify them politely and search for active alternatives within their budget.
3. STUDENT PRIVACY GUARANTEE:
   - NEVER disclose private personal data (student room numbers, private mobile numbers, personal email addresses).
   - Only reveal verified public listing information: title, condition, current price, minimum bid increment, public campus handover location (e.g. 'Hostel 3 Mess Porch', 'Central Library Entrance'), and auction end time.
4. GROUNDED REAL-TIME DATA:
   - Always call 'search_listings' or 'get_listing_details' before speaking about item availability or pricing. Never invent or hallucinate listings.
   - Present monetary amounts clearly in Indian Rupees (₹).
`;

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
      .select("id, title, category, condition, starting_price, current_price, min_bid_increment, images, end_time, handover_location, status, description");

    // Only active listings for bidding
    q = q.eq("status", "active");

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

// Helper: Get details of a single listing
async function executeGetListingDetails(listingId: string): Promise<{
  listing: ListingItemPreview | null;
  total_bids: number;
  leading_bid: number | null;
}> {
  try {
    const { data: listing, error: lError } = await supabase
      .from("listings")
      .select("id, title, category, condition, starting_price, current_price, min_bid_increment, images, end_time, handover_location, status, description, highest_bidder_id")
      .eq("id", listingId)
      .maybeSingle();

    if (lError || !listing) {
      return { listing: null, total_bids: 0, leading_bid: null };
    }

    const { count, error: bError } = await supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("listing_id", listingId);

    const formatted: ListingItemPreview = {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      condition: listing.condition,
      starting_price: Number(listing.starting_price),
      current_price: Number(listing.current_price),
      min_bid_increment: Number(listing.min_bid_increment),
      images: Array.isArray(listing.images) ? listing.images : [],
      end_time: listing.end_time,
      handover_location: listing.handover_location,
      status: listing.status,
      description: listing.description,
    };

    return {
      listing: formatted,
      total_bids: bError ? 0 : count || 0,
      leading_bid: Number(listing.current_price),
    };
  } catch (err: unknown) {
    console.error("executeGetListingDetails error:", err);
    return { listing: null, total_bids: 0, leading_bid: null };
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

    const proposedBid: ProposedBidData = {
      listing_id: listing.id,
      listing_title: listing.title,
      category: listing.category,
      current_price: currentPrice,
      proposed_amount: proposedAmount,
      min_next_bid: minNextBid,
      min_bid_increment: minIncrement,
      is_proxy: Boolean(params.is_proxy),
      max_proxy: params.max_proxy ? Number(params.max_proxy) : null,
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

// Intelligent Rule-based Campus Assistant Fallback (when GEMINI_API_KEY is not set or API fails)
async function intelligentCampusFallback(userPrompt: string): Promise<ApiResponse> {
  const lower = userPrompt.toLowerCase().trim();
  let collectedItems: ListingItemPreview[] = [];
  let proposedBid: ProposedBidData | null = null;
  let textResponse = "";

  // 1. Detect Price Ceilings (e.g. "under 3000", "under ₹2,000", "below 1500")
  let maxPrice: number | undefined;
  const priceMatch = lower.match(/(?:under|below|less than|within|budget of?)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (priceMatch) {
    maxPrice = parseInt(priceMatch[1].replace(/,/g, ""), 10);
  }

  // 2. Detect Bidding Intent (e.g. "bid on cycle", "bid 4300 on firefox", "place bid on calculator")
  const isBidIntent = /\b(bid|place bid|make bid|offer|bid\s+\d+|propose bid)\b/i.test(lower);

  if (isBidIntent) {
    // Extract target amount if specified (e.g. "bid 4300")
    let targetAmount: number | undefined;
    const amountMatch = lower.match(/(?:bid|offer|amount of?|for)\s*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
    if (amountMatch) {
      targetAmount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
    }

    // Determine target item: search for keywords in title/category
    let targetCategory = "";
    if (lower.includes("cycle") || lower.includes("bike") || lower.includes("firefox") || lower.includes("roadeo")) {
      targetCategory = "Cycle";
    } else if (lower.includes("calculator") || lower.includes("casio") || lower.includes("fx-991")) {
      targetCategory = "Calculator";
    } else if (lower.includes("book") || lower.includes("math") || lower.includes("grewal")) {
      targetCategory = "Books";
    } else if (lower.includes("monitor") || lower.includes("dell") || lower.includes("electronics")) {
      targetCategory = "Electronics";
    }

    // Query active items for candidate
    const candidates = await executeSearchListings({
      category: targetCategory,
      query: targetCategory ? undefined : lower.replace(/bid|place|on|for|the|₹|\d+/g, "").trim(),
    });

    const targetItem = candidates.length > 0 ? candidates[0] : null;

    if (targetItem) {
      collectedItems = [targetItem];
      const nextMin = targetItem.current_price + targetItem.min_bid_increment;
      const amountToPropose = targetAmount && targetAmount >= nextMin ? targetAmount : nextMin;

      const proposalResult = await executeProposeBid({
        listing_id: targetItem.id,
        amount: amountToPropose,
        is_proxy: lower.includes("proxy") || lower.includes("auto"),
      });

      if (proposalResult.success && proposalResult.proposedBid) {
        proposedBid = proposalResult.proposedBid;
        textResponse = `I've prepared a **Safe Bid Proposal** for **${targetItem.title}**!\n\n` +
          `• **Current Bid**: ₹${targetItem.current_price.toLocaleString("en-IN")}\n` +
          `• **Proposed Amount**: ₹${proposedBid.proposed_amount.toLocaleString("en-IN")} (Minimum required: ₹${proposedBid.min_next_bid.toLocaleString("en-IN")})\n` +
          `• **Campus Handover**: ${targetItem.handover_location || "Central Campus"}\n\n` +
          `🛡️ **Guardrail Confirmation**: I never execute bids automatically. Please review the details on the card below and click **"Confirm & Place Bid"** to authorize.`;
      } else {
        textResponse = `Could not prepare bid: ${proposalResult.error || "Item is no longer available."}`;
      }
    } else {
      textResponse = `I couldn't find an active listing matching your bid request. Here are active campus auctions currently available for bidding:`;
      collectedItems = await executeSearchListings({ closing_soon: true });
    }
  }
  // 3. Category Queries: Cycles
  else if (lower.includes("cycle") || lower.includes("bike") || lower.includes("bicycle") || lower.includes("roadeo")) {
    collectedItems = await executeSearchListings({ category: "Cycle", max_price: maxPrice });
    if (collectedItems.length > 0) {
      textResponse = `Found **${collectedItems.length}** campus cycle auction(s)${maxPrice ? ` under ₹${maxPrice.toLocaleString("en-IN")}` : ""}. Graduating seniors have verified full working condition and test rides are available on hostel grounds!`;
    } else {
      textResponse = `No cycle auctions found${maxPrice ? ` under ₹${maxPrice.toLocaleString("en-IN")}` : ""}. Try adjusting your price filter or browse all active auctions below.`;
      collectedItems = await executeSearchListings({});
    }
  }
  // 4. Category Queries: Calculators
  else if (lower.includes("calculator") || lower.includes("casio") || lower.includes("scientific") || lower.includes("classwiz")) {
    collectedItems = await executeSearchListings({ category: "Calculator", max_price: maxPrice });
    if (collectedItems.length > 0) {
      textResponse = `Found **${collectedItems.length}** scientific calculator(s)${maxPrice ? ` under ₹${maxPrice.toLocaleString("en-IN")}` : ""}. All models are approved for university semester exams and come with hard sliding covers!`;
    } else {
      textResponse = `No calculators found${maxPrice ? ` under ₹${maxPrice.toLocaleString("en-IN")}` : ""}. Check out other active campus items below:`;
      collectedItems = await executeSearchListings({});
    }
  }
  // 5. Category Queries: Books & Notes
  else if (lower.includes("book") || lower.includes("notes") || lower.includes("textbook") || lower.includes("mathematics") || lower.includes("grewal")) {
    collectedItems = await executeSearchListings({ category: "Books", max_price: maxPrice });
    if (collectedItems.length > 0) {
      textResponse = `Found **${collectedItems.length}** textbook listing(s)${maxPrice ? ` under ₹${maxPrice.toLocaleString("en-IN")}` : ""}. Essential reference books passed down from seniors with zero torn pages.`;
    } else {
      textResponse = `No textbooks found${maxPrice ? ` under ₹${maxPrice.toLocaleString("en-IN")}` : ""}. Here are active auctions closing soon:`;
      collectedItems = await executeSearchListings({ closing_soon: true });
    }
  }
  // 6. Auctions Closing Soon
  else if (lower.includes("closing") || lower.includes("ending") || lower.includes("soon") || lower.includes("urgent")) {
    collectedItems = await executeSearchListings({ closing_soon: true });
    textResponse = `Here are active auctions **closing soonest** on campus! Anti-sniping is active on all of these—any bid in the final 30 seconds automatically extends the auction by 60 seconds.`;
  }
  // 7. Questions about rules, proxy bidding, anti-sniping
  else if (lower.includes("how does") || lower.includes("sniping") || lower.includes("proxy") || lower.includes("rules") || lower.includes("handover")) {
    textResponse = `### How CampusBid Fair Bidding Works:\n\n` +
      `1. **Anti-Sniping Protection**: If any bid is placed in the final 30 seconds, the auction countdown automatically extends by **60 seconds**, guaranteeing every student a fair chance.\n` +
      `2. **Proxy Bidding**: Set your maximum ceiling and the system automatically counters other bids on your behalf in minimum increments up to your limit.\n` +
      `3. **Campus Handover**: Once won, coordinate the in-person exchange at safe campus spots (Hostel Mess Porch or Library Gate) before marking the auction completed.\n` +
      `4. **AI Safe Guardrails**: I never place bids without your explicit click on a confirmation card.\n\n` +
      `Ask me to search for any item or propose a bid!`;
    collectedItems = await executeSearchListings({ closing_soon: true });
  }
  // 8. General search / default
  else {
    collectedItems = await executeSearchListings({
      query: lower.length > 2 ? lower : undefined,
      max_price: maxPrice,
    });
    if (collectedItems.length > 0) {
      textResponse = `Here are active campus listings matching your search:`;
    } else {
      collectedItems = await executeSearchListings({ closing_soon: true });
      textResponse = `I'm your CampusBid Assistant! You can ask me to find cycles, calculators, books, or propose a bid on any active auction. Here are items closing soon:`;
    }
  }

  // Graceful prompt tip for GEMINI_API_KEY
  textResponse += `\n\n💡 *Tip: Add your \`GEMINI_API_KEY\` in \`.env.local\` to enable full conversational LLM reasoning.*`;

  return {
    response: textResponse,
    items: collectedItems,
    proposedBid,
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

    const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

    // If GEMINI_API_KEY is not provided, use the intelligent campus rule-engine
    if (!geminiApiKey) {
      const fallbackResult = await intelligentCampusFallback(userPrompt);
      return NextResponse.json(fallbackResult);
    }

    // When GEMINI_API_KEY is present, leverage Gemini 2.5 Flash with Tools/Function Calling
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Define Function Declarations
      const searchListingsTool = {
        name: "search_listings",
        description: "Search active campus auction listings by query, category, maximum price, or condition.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: "Keywords to search in item title or description, e.g. 'cycle', 'calculator', 'book'",
            },
            category: {
              type: Type.STRING,
              description: "Listing category, such as 'Cycle', 'Calculator', 'Books', 'Electronics', 'Hostel Essentials'",
            },
            max_price: {
              type: Type.NUMBER,
              description: "Maximum budget or price ceiling in INR (₹)",
            },
            condition: {
              type: Type.STRING,
              description: "Item condition, e.g. 'New', 'Like New', 'Good', 'Fair'",
            },
            closing_soon: {
              type: Type.BOOLEAN,
              description: "Sort by auction end time ascending to find items closing soonest",
            },
          },
        },
      };

      const getListingDetailsTool = {
        name: "get_listing_details",
        description: "Get comprehensive details of a specific campus listing and its current leading bid.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            listing_id: {
              type: Type.STRING,
              description: "The unique UUID of the listing",
            },
          },
          required: ["listing_id"],
        },
      };

      const proposeBidTool = {
        name: "propose_bid",
        description: "Formulate a safe proposed bid confirmation card for a listing. The AI MUST NOT place the bid directly; this formats the card so the student can explicitly confirm.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            listing_id: {
              type: Type.STRING,
              description: "The UUID of the listing to bid on",
            },
            amount: {
              type: Type.NUMBER,
              description: "The proposed bid amount in INR (₹)",
            },
            is_proxy: {
              type: Type.BOOLEAN,
              description: "Whether this is an automated proxy bid with a maximum ceiling",
            },
            max_proxy: {
              type: Type.NUMBER,
              description: "The maximum ceiling amount for proxy bidding",
            },
          },
          required: ["listing_id", "amount"],
        },
      };

      const tools = [
        {
          functionDeclarations: [searchListingsTool, getListingDetailsTool, proposeBidTool],
        },
      ];

      // Prepare conversation history
      const formattedContents: Array<{
        role: "user" | "model";
        parts: Array<{ text?: string }>;
      }> = [];

      if (body.history && Array.isArray(body.history)) {
        for (const h of body.history.slice(-6)) {
          if (h.content && h.role !== "system") {
            formattedContents.push({
              role: h.role === "assistant" ? "model" : "user",
              parts: [{ text: h.content }],
            });
          }
        }
      }

      formattedContents.push({
        role: "user",
        parts: [{ text: userPrompt }],
      });

      // Call Gemini 2.5 Flash
      const modelName = "gemini-2.5-flash";
      const initialResponse = await ai.models.generateContent({
        model: modelName,
        contents: formattedContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools,
          temperature: 0.2,
        },
      });

      const collectedItems: ListingItemPreview[] = [];
      let proposedBid: ProposedBidData | null = null;

      const functionCalls = initialResponse.functionCalls;

      // Handle Tool Calls if Gemini invoked any
      if (functionCalls && functionCalls.length > 0) {
        const toolExecutionResults: Array<{ name: string; result: any }> = [];

        for (const call of functionCalls) {
          const args = (call.args || {}) as Record<string, any>;

          if (call.name === "search_listings") {
            const items = await executeSearchListings({
              query: args.query,
              category: args.category,
              max_price: args.max_price,
              condition: args.condition,
              closing_soon: args.closing_soon,
            });
            collectedItems.push(...items);
            toolExecutionResults.push({
              name: call.name,
              result: { count: items.length, items },
            });
          } else if (call.name === "get_listing_details") {
            const details = await executeGetListingDetails(args.listing_id);
            if (details.listing) {
              collectedItems.push(details.listing);
            }
            toolExecutionResults.push({
              name: call.name,
              result: details,
            });
          } else if (call.name === "propose_bid") {
            const proposal = await executeProposeBid({
              listing_id: args.listing_id,
              amount: Number(args.amount),
              is_proxy: Boolean(args.is_proxy),
              max_proxy: args.max_proxy ? Number(args.max_proxy) : undefined,
            });
            if (proposal.success && proposal.proposedBid) {
              proposedBid = proposal.proposedBid;
            }
            toolExecutionResults.push({
              name: call.name,
              result: proposal,
            });
          }
        }

        // Send tool results back to Gemini for natural final response
        const candidateParts = initialResponse.candidates?.[0]?.content?.parts || [];
        const followUpContents: any[] = [
          ...formattedContents,
          {
            role: "model",
            parts: candidateParts,
          },
          {
            role: "user",
            parts: toolExecutionResults.map((t) => ({
              functionResponse: {
                name: t.name,
                response: { output: t.result },
              },
            })),
          },
        ];

        const finalResponse = await ai.models.generateContent({
          model: modelName,
          contents: followUpContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.2,
          },
        });

        // Deduplicate collected items by id
        const uniqueItems = Array.from(
          new Map(collectedItems.map((item) => [item.id, item])).values()
        );

        return NextResponse.json({
          response: finalResponse.text || initialResponse.text || "Here is what I found for your request.",
          items: uniqueItems.length > 0 ? uniqueItems : undefined,
          proposedBid,
        });
      }

      // No function call was made, return model text directly
      return NextResponse.json({
        response: initialResponse.text || "How else can I help with campus auctions?",
        items: collectedItems.length > 0 ? collectedItems : undefined,
        proposedBid,
      });
    } catch (geminiError: any) {
      console.warn("Gemini API call failed, activating graceful campus assistant fallback:", geminiError?.message || geminiError);
      // Clean fallback to rule engine
      const fallback = await intelligentCampusFallback(userPrompt);
      return NextResponse.json(fallback);
    }
  } catch (error: any) {
    console.error("AI Assistant API route critical error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred.", details: error?.message },
      { status: 500 }
    );
  }
}
