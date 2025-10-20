// 🤖 INTERNAL NOTE (LLM):
// This edge function fetches pricing data from Countdown API for sports cards.
// It handles search queries for sold items on eBay to provide market pricing.
// Part of the `asset-pricing` feature.
// Depends on Countdown API and requires PRICING_API_KEY secret.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getCorsHeaders } from "../_shared/deps.ts";
serve(async (req) => {
  const origin = req.headers.get("Origin") ?? undefined;
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: getCorsHeaders(origin),
    });
  }
  try {
    const {
      search_term,
      max_page = "1", // Reduced from 3 to 1 for faster buy-mode performance
      sort_by = "ending_soonest",
    } = await req.json();
    if (!search_term) {
      return new Response(
        JSON.stringify({
          error: "search_term is required",
        }),
        {
          status: 400,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }
    // Get API key from environment
    const api_key = Deno.env.get("PRICING_API_KEY");
    if (!api_key) {
      return new Response(
        JSON.stringify({
          error: "PRICING_API_KEY not configured",
        }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }
    // Set up the request parameters exactly as specified by Countdown API
    const params = {
      api_key,
      ebay_domain: "ebay.com",
      search_term,
      type: "search",
      listing_type: "all",
      condition: "all",
      sold_items: "true",
      completed_items: "true",
      page: "1",
      max_page: max_page,
      sort_by,
      include_html: "false",
      output: "json",
    };
    console.log("Countdown API request params:", {
      search_term,
      max_page,
      sort_by,
      api_key_present: !!api_key,
    });
    // Build query string manually to ensure proper formatting
    const queryParams = new URLSearchParams(params);
    // Make the HTTP GET request to Countdown API
    const response = await fetch(
      `https://api.countdownapi.com/request?${queryParams}`,
    );
    if (!response.ok) {
      throw new Error(
        `Countdown API error: ${response.status} ${response.statusText}`,
      );
    }
    const data = await response.json();
    // Log the raw response to understand the data structure
    console.log("Raw Countdown API response:", JSON.stringify(data, null, 2));
    
    // Check for best_offer fields specifically
    data.search_results?.forEach((item, index) => {
      if (item.best_offer || item.seller_info?.name === 'pm_sports_cards') {
        console.log(`🔍 Item ${index}: best_offer=${item.best_offer}, seller=${item.seller_info?.name || item.seller_name}`);
      }
    });
    // Process and clean the data, extracting all available fields
    const processedData = {
      search_results:
        data.search_results?.map((item) => {
          // Map Countdown API response to match our expected format
          return {
            // Core data - map from actual Countdown API fields
            title: item.title,
            price: item.price,
            sold_price: item.price, // Countdown uses 'price' for sold items
            listing_price: item.price,
            shipping: item.shipping_cost,
            condition: item.condition,
            sold_date: item.ended?.date?.raw ? {
              date: {
                raw: (() => {
                  const date = new Date(item.ended.date.raw);
                  // Set to midnight to avoid processing time contamination
                  date.setHours(0, 0, 0, 0);
                  return date.toISOString();
                })()
              }
            } : null, // Transform to match salesGetter.ts pattern
            sale_type: item.ended?.type?.raw, // Map from ended.type.raw  
            is_auction: item.is_auction,
            best_offer: item.best_offer,
            
            // URLs - map from actual Countdown API fields
            url: item.link, // Countdown uses 'link' not 'url'
            image_url: item.image, // Countdown uses 'image' not 'image_url'
            thumbnail: item.image,
            
            // Seller info - exact from Countdown API
            seller_name: item.seller_name || item.seller_info?.name,
            seller_feedback_score: item.seller_feedback_score || item.seller_info?.review_count,
            seller_feedback_percentage: item.seller_feedback_percentage || item.seller_info?.positive_feedback_percent,
            
            // Include everything else as-is
            ...item
          };
        }) || [],
      total_results: data.total_results || 0,
      pagination: data.pagination || {
        current_page: 1,
        total_pages: 1,
      },
      search_term,
    };
    return new Response(JSON.stringify(processedData), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Countdown API error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to fetch pricing data",
        details: error.message,
      }),
      {
        status: 500,
        headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
      },
    );
  }
});
