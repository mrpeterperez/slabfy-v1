import { Router } from "express";
import { storage } from "../storage-mod/registry";
import { v4 as uuidv4 } from "uuid";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { authenticateUser } from "../supabase";
import rateLimit from "express-rate-limit";

interface CardShow {
  id: string;
  name: string;
  dateStart: string;
  dateEnd: string;
  city: string;
  state: string;
  website: string | null;
  venueName: string | null;
  description: string | null;
  fetchedAt: Date;
  isActive: boolean;
}

const router = Router();

// Strict rate limiting for resource-intensive scraping endpoints
const scrapingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 2, // Maximum 2 scraping requests per hour per IP
  skipSuccessfulRequests: false, // Count all requests, not just failed ones
  message: 'Too many scraping requests. Please try again in an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`Scraping rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      error: 'Too many scraping requests from this IP. Please try again in an hour.',
      retryAfter: '1 hour'
    });
  }
});

// Semaphore to prevent concurrent scraping operations
let isScrapingInProgress = false;

// Constants for security limits
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB max response size
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout
const ALLOWED_CONTENT_TYPES = ['text/html', 'application/xhtml+xml'];

/**
 * Cleans card show data to return only essential fields
 */
function cleanCardShowData(show: any): any {
  // Extract clean event name from city field
  function extractEventName(city: string): string {
    if (!city || !city.includes('.')) {
      return "Card Show";
    }
    
    const parts = city.split('.');
    if (parts.length < 2) return "Card Show";
    
    const showPart = parts[1].trim();
    const showDetails = showPart.split(',');
    const showName = showDetails[0]?.trim();
    
    if (!showName || showName.length < 3) {
      return "Card Show";
    }
    
    return showName;
  }
  
  // Extract clean location (City, State)
  function extractLocation(city: string, state: string): string {
    if (!city || !city.includes('.')) {
      return state;
    }
    
    const beforeShow = city.split('.')[0];
    const cityStateParts = beforeShow.split(',');
    
    if (cityStateParts.length >= 2) {
      const cityName = cityStateParts[1]?.trim();
      return cityName ? `${cityName}, ${state}` : state;
    }
    
    return state;
  }
  
  // Extract venue name if available
  function extractVenue(city: string): string | null {
    if (!city || !city.includes('.')) return null;
    
    const parts = city.split('.');
    if (parts.length < 2) return null;
    
    const showPart = parts[1].trim();
    const showDetails = showPart.split(',');
    
    if (showDetails.length >= 2) {
      const venue = showDetails[1]?.trim();
      if (venue && venue.length > 3 && venue.length < 60) {
        return venue;
      }
    }
    
    return null;
  }
  
  return {
    id: show.id,
    name: extractEventName(show.city || ''),
    dateStart: show.date_start || show.dateStart,
    dateEnd: show.date_end || show.dateEnd,
    location: extractLocation(show.city || '', show.state || ''),
    venue: extractVenue(show.city || ''),
    description: null // Skip the redundant auto-generated descriptions
  };
}

// Search endpoint with query parameter support
router.get("/search", authenticateUser, async (req, res) => {
  try {
    const searchQuery = req.query.q as string;
    
    // Validate and sanitize search query
    if (searchQuery && typeof searchQuery !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: "Search query must be a string" 
      });
    }
    
    if (searchQuery && searchQuery.length > 100) {
      return res.status(400).json({ 
        success: false, 
        error: "Search query too long (max 100 characters)" 
      });
    }
    
    let rawShows;
    if (searchQuery && searchQuery.trim().length > 0) {
      // Sanitize the search query to prevent potential issues
      const sanitizedQuery = searchQuery.trim().replace(/[<>\"']/g, '');
      if (sanitizedQuery.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid search query after sanitization" 
        });
      }
      
      // Perform actual search if query provided
      rawShows = await storage.searchCardShows(sanitizedQuery, 100);
    } else {
      // Return upcoming shows if no search query
      rawShows = await storage.getUpcomingCardShows(100);
    }
    
    // Clean the data before returning
  const cleanShows = rawShows.map((show: any) => cleanCardShowData(show));
    
    res.json({ success: true, shows: cleanShows, count: cleanShows.length });
  } catch (error) {
    console.error("Search error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      success: false, 
      error: "Failed to search shows",
      details: errorMessage
    });
  }
});

// Monthly fetch endpoint – scrapes Sports Collectors Digest
router.post("/fetch-monthly", scrapingLimiter, authenticateUser, async (_req, res) => {
  try {
    // Check if scraping is already in progress to prevent concurrent operations
    if (isScrapingInProgress) {
      console.warn("Scraping already in progress, rejecting concurrent request");
      return res.status(429).json({ 
        success: false, 
        error: "Scraping operation already in progress. Please try again later.",
        retryAfter: '5 minutes'
      });
    }

    isScrapingInProgress = true;
    console.log("Starting monthly fetch from Sports Collectors Digest...");
    
    const shows = await scrapeCardShows();
    console.log(`Found ${shows.length} shows`);

    if (shows.length > 0) {
      const inserted = await storage.bulkInsertCardShows(shows);
      res.json({ success: true, message: `Added ${inserted.length} shows`, count: inserted.length });
    } else {
      res.json({ success: true, message: "No new shows found", count: 0 });
    }
  } catch (error) {
    console.error("Fetch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch shows",
      details: errorMessage
    });
  } finally {
    // Always reset the scraping flag
    isScrapingInProgress = false;
  }
});

/**
 * Downloads the calendar page and extracts shows with comprehensive security measures.
 */
async function scrapeCardShows(): Promise<CardShow[]> {
  const url = "https://sportscollectorsdigest.com/collecting-101/show-calendar";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  
  try {
    console.log(`Starting secure scrape of ${url}...`);
    
    // Make request with timeout, proper headers, and security measures
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SlabfyBot/1.0; +https://slabfy.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      signal: controller.signal,
      // NOTE: node-fetch v3 does not support RequestInit.timeout; AbortController handles timeouts
    });

    clearTimeout(timeoutId);

    // Validate response status
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Validate content type
    const contentType = response.headers.get('content-type') || '';
    const isValidContentType = ALLOWED_CONTENT_TYPES.some(type => 
      contentType.toLowerCase().includes(type)
    );
    
    if (!isValidContentType) {
      throw new Error(`Invalid content type: ${contentType}. Expected HTML content.`);
    }

    // Validate content length
    const headerContentLength = response.headers.get('content-length');
    if (headerContentLength && parseInt(headerContentLength) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large: ${headerContentLength} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }

    console.log(`Response received: ${response.status} ${response.statusText}, Content-Type: ${contentType}`);

    // Read response text with size limiting (use content-length if present; otherwise trust downstream parsing)
    const headerContentLength2 = response.headers.get('content-length');
    if (headerContentLength2 && parseInt(headerContentLength2) > MAX_RESPONSE_SIZE) {
      throw new Error(`Response too large: ${headerContentLength2} bytes (max: ${MAX_RESPONSE_SIZE})`);
    }
    const html = await response.text();

    console.log(`Successfully downloaded ${html.length} characters of HTML content`);
    
    // Validate HTML content basics
    if (html.length < 100) {
      throw new Error('Response HTML too short - possibly blocked or invalid');
    }
    
    if (!html.toLowerCase().includes('<html') && !html.toLowerCase().includes('<!doctype')) {
      throw new Error('Response does not appear to be valid HTML');
    }

    return parseShowCalendar(html);
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && (error.name === 'AbortError')) {
      console.error(`Scraping timeout after ${REQUEST_TIMEOUT_MS}ms`);
      throw new Error(`Request timeout after ${REQUEST_TIMEOUT_MS / 1000} seconds`);
    }
    
    console.error("Secure scraping error:", {
      error: error instanceof Error ? error.message : String(error),
      url,
      timestamp: new Date().toISOString()
    });
    
    // Re-throw with more specific error information
    throw error instanceof Error ? error : new Error('Unknown scraping error occurred');
  }
}

/**
 * Converts raw HTML into an array of CardShow objects.
 * Uses Cheerio instead of brittle regex-only parsing so we capture **all** events
 * regardless of minor markup variations.
 */
function parseShowCalendar(html: string): CardShow[] {
  const $ = cheerio.load(html);
  const shows: CardShow[] = [];
  const dedupe = new Set<string>();

  const monthMap: Record<string, string> = {
    january: "01", jan: "01",
    february: "02", feb: "02",
    march: "03", mar: "03",
    april: "04", apr: "04",
    may: "05",
    june: "06", jun: "06",
    july: "07", jul: "07",
    august: "08", aug: "08",
    september: "09", sept: "09", sep: "09",
    october: "10", oct: "10",
    november: "11", nov: "11",
    december: "12", dec: "12",
  };

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthIdx = today.getMonth(); // 0‑based

  // Grab every paragraph inside the article body – this is where the calendar lives
  $("article p, .elementor-widget-container p").each((_, el) => {
    // Get text and decode HTML entities properly
    const raw = $(el).text().replace(/\u00a0/g, " ").trim();
    if (!raw) return;

    // Example date formats: "July 6-7", "Aug. 14", "September 1–3"
    const dateRe = /((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[.]?)\s+(\d{1,2})(?:[\-–—]\s*(\d{1,2}))?/i;
    const dateMatch = raw.match(dateRe);
    if (!dateMatch) return; // skip lines without a recognisable date

    const [, monthStrRaw, startDayRaw, endDayRaw] = dateMatch;
    const monthKey = monthStrRaw.toLowerCase().replace(".", "");
    const month = monthMap[monthKey];
    if (!month) return;

    const startDay = startDayRaw.padStart(2, "0");
    const dateStart = buildDate(currentYear, month, startDay, currentMonthIdx, parseInt(month) - 1);

    // If a range (e.g. 10‑12) is provided, build the end‑date, otherwise use start
    let dateEnd = dateStart;
    if (endDayRaw) {
      const endDay = endDayRaw.padStart(2, "0");
      dateEnd = buildDate(currentYear, month, endDay, currentMonthIdx, parseInt(month) - 1);
    }

    // Remove the date part so we can parse City / State / Name cleanly
    const rest = raw.substring(dateMatch.index! + dateMatch[0].length).replace(/^[\s,:;–—-]+/, "");

    // Keep original simple parsing that works
    const locRe = /^(.+?),\s*([A-Z]{2})[\s,–—-]+(.+)$/;
    const locMatch = rest.match(locRe);
    if (!locMatch) return;

    const [, cityRaw, stateRaw, nameRaw] = locMatch;
    const city = cityRaw.trim();
    const state = stateRaw.trim();
    
    // Keep original simple name processing
    let name = nameRaw.trim();
    
    // Decode HTML entities
    name = cheerio.load(`<div>${name}</div>`)('div').text().trim().replace(/\.$/, "");
    
    // Skip if name is too short
    if (name.length < 5) return;

    const key = `${name.toLowerCase()}-${dateStart}-${city.toLowerCase()}`;
    if (dedupe.has(key)) return; // avoid dupes across paragraphs
    dedupe.add(key);

    shows.push({
      id: uuidv4(),
      name,
      dateStart,
      dateEnd,
      city,
      state,
      website: null,
      venueName: null,
      description: `Card show in ${city}, ${state}`,
      fetchedAt: new Date(),
      isActive: true,
    });
  });

  console.log(`Parsed ${shows.length} events`);
  return shows;
}

/**
 * Builds a YYYY-MM-DD string, adjusting year if the event falls in the next/previous calendar year
 * relative to today (handles events straddling New Year).
 */
function buildDate(baseYear: number, month: string, day: string, currentMonthIdx: number, eventMonthIdx: number): string {
  let year = baseYear;
  // "July" events parsed in December should belong to next year, etc.
  if (eventMonthIdx < currentMonthIdx - 6) {
    year += 1;
  } else if (eventMonthIdx - currentMonthIdx > 6) {
    year -= 1;
  }
  return `${year}-${month}-${day}`;
}

export default router;
