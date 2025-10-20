# Card Shows Management System

## Overview

The SlabFy platform automatically scrapes authentic card show data from Sports Collectors Digest, the industry-standard source used by card dealers nationwide.

## Current System Status

- ✅ **200+ Authentic Card Shows** - Including major shows like Front Row Card Show, Southpaw Sports Cards Show, Silicon Valley Cards & Collectibles Show
- ✅ **Sports Collectors Digest Integration** - Reliable scraping from the authoritative industry source
- ✅ **Organized by State** - Complete coverage across all 50 US states
- ✅ **Duplicate Prevention** - Smart deduplication to prevent redundant entries
- ✅ **Date Range Support** - Handles single-day and multi-day events

## Manual Monthly Update

To refresh card shows data monthly, run:

```bash
# Via API endpoint
curl -X POST http://localhost:5000/api/card-shows/fetch-monthly

# Via standalone script
node scripts/monthly-card-shows-fetch.js
```

## Automated Monthly Updates (Production)

For production deployment, set up a monthly cron job:

```bash
# Add to crontab (runs on 1st of every month at 2 AM)
0 2 1 * * /usr/bin/node /path/to/project/scripts/monthly-card-shows-fetch.js

# Or using GitHub Actions/Cloud Functions
```

## Data Sources

- **Primary**: https://sportscollectorsdigest.com/collecting-101/show-calendar
- **Coverage**: All 50 US states with hundreds of authentic shows
- **Update Frequency**: Monthly refresh recommended
- **Data Quality**: Industry-standard source used by actual card dealers

## Key Features

### Enhanced Parsing
- Handles various date formats (single day, date ranges)
- Extracts show names, venues, cities, states
- Processes HTML content with smart text extraction

### Data Integrity
- Duplicate prevention by name/date/city combination
- Bulk insert with conflict resolution
- Maintains data consistency across updates

### API Endpoints
- `GET /api/card-shows/search` - Retrieve all available shows
- `POST /api/card-shows/fetch-monthly` - Manual refresh trigger

## Troubleshooting

If shows are missing:
1. Check Sports Collectors Digest website accessibility
2. Verify parsing patterns match current HTML structure
3. Run manual fetch to refresh data
4. Check server logs for parsing errors

## Recent Improvements

- **July 3, 2025**: Completely removed unreliable Perplexity API
- **July 3, 2025**: Implemented Sports Collectors Digest scraping
- **July 3, 2025**: Increased show count from 10 to 200+ authentic entries
- **July 3, 2025**: Added support for major shows like Front Row Card Show