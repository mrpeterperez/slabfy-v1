# eBay Product Data API Parameters Reference Guide

## Overview

This API provides real-time access to eBay product data through a simple HTTP GET request to `https://api.countdownapi.com/request`. This guide covers all parameter types and their usage for optimal data retrieval.

## Base API Structure

**Endpoint**: `https://api.countdownapi.com/request`  
**Method**: HTTP GET  
**Authentication**: API Key (query parameter)

**Basic Request Format**:
```
https://api.countdownapi.com/request?api_key=YOUR_API_KEY&type=REQUEST_TYPE&[additional_parameters]
```

---

## 1. Common Parameters

These parameters are available for **all request types** and should be appended as querystring parameters.

### Required Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `api_key` | string | **Required**. Your Countdown API account key |
| `type` | string | **Required**. Defines the type of eBay data to retrieve |

### Optional Common Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `customer_location` | string | Based on eBay domain | Country that the API uses when retrieving pages from eBay. Useful for cross-border shipping data |
| `customer_zipcode` | string | - | Specific zip/postal code for request location (not all countries support this) |
| `include_html` | boolean | `false` | Whether to include raw HTML in response (increases response size) |
| `output` | string | `json` | Format for results: `json`, `html`, or `csv` |
| `csv_fields` | string | - | Comma-separated list of fields to include when `output=csv` |
| `include_fields` | string | - | Comma-separated list of JSON fields to include (dot notation supported) |
| `exclude_fields` | string | - | Comma-separated list of JSON fields to exclude (dot notation supported) |

### Valid Type Values

| Type | Description | Additional Parameters |
|------|-------------|----------------------|
| `search` | Search results for a search term | [Search Parameters](#2-search-parameters) |
| `product` | Product data for an EPID | [Product Parameters](#3-product-parameters) |
| `reviews` | Customer reviews for a product | [Reviews Parameters](#reviews-parameters) |
| `seller-profile` | Seller profile information | [Seller Profile Parameters](#4-seller-profile-parameters) |
| `seller-feedback` | Seller feedback data | [Seller Feedback Parameters](#seller-feedback-parameters) |

**Example Common Parameters Usage**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="search" \
  -d customer_location="United States" \
  -d output="json"
```

---

## 2. Search Parameters

**Used when**: `type=search`  
**Purpose**: Retrieve search results for eBay listings

### Core Search Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `ebay_domain` | string | Optional | eBay domain to search (default: ebay.com) |
| `search_term` | string | Optional* | Search term for eBay items |
| `url` | string | Optional* | Direct eBay search results page URL |

*Either `search_term` or `url` must be provided

### Filtering Parameters

| Parameter | Type | Options | Description |
|-----------|------|---------|-------------|
| `category_id` | string | - | Filter to specific category (found in eBay URLs as `_sacat`) |
| `listing_type` | string | `all`, `buy_it_now`, `auction`, `accepts_offers` | Type of listings to search |
| `condition` | string | `all`, `new`, `used`, `open_box`, `manufacturer_refurbished`, `seller_refurbished`, `parts_or_not_working`, `not_specified` | Item condition filter |
| `sold_items` | boolean | `true`, `false` | Filter to sold items only |
| `completed_items` | boolean | `true`, `false` | Filter to completed items only |
| `authorized_sellers` | boolean | `true`, `false` | Filter to authorized sellers only |
| `returns_accepted` | boolean | `true`, `false` | Filter to items with returns accepted |
| `free_returns` | boolean | `true`, `false` | Filter to items with free returns |
| `authenticity_verified` | boolean | `true`, `false` | Filter to authenticity verified items |
| `deals_and_savings` | boolean | `true`, `false` | Filter to deals and savings items |
| `sale_items` | boolean | `true`, `false` | Filter to sale items only |

### Sorting and Pagination

| Parameter | Type | Options | Description |
|-----------|------|---------|-------------|
| `sort_by` | string | `best_match`, `price_high_to_low`, `price_low_to_high`, `price_high_to_low_plus_postage`, `price_low_to_high_plus_postage`, `newly_listed`, `ending_soonest` | Sort order for results |
| `page` | integer | - | Current page of search results |
| `max_page` | integer | - | Get multiple pages in one request (auto-pagination) |
| `num` | integer | `60`, `120`, `240` | Number of search results per page |

### Advanced Filtering

| Parameter | Type | Description |
|-----------|------|-------------|
| `facets` | string | Advanced filters in format: `Brand=SanDisk,Format=MicroSD`. Use pipe `|` for multiple values: `Brand=SanDisk\|Samsung` |
| `allow_rewritten_results` | boolean | Include results that appear under "Results matching fewer words" (default: `true`) |

**Example Search Request (Sports Cards)**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="search" \
  -d ebay_domain="ebay.com" \
  -d search_term="2024 Topps Chrome Julio Rodriguez PSA 10" \
  -d category_id="Sports Trading Cards" \
  -d condition="new" \
  -d sold_items="true" \
  -d completed_items="true" \
  -d sort_by="ending_soonest" \
  -d max_page="3"
```

---

## 3. Product Parameters

**Used when**: `type=product`  
**Purpose**: Get detailed product information for a specific eBay item

### Core Product Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `epid` | string | Optional* | eBay Product ID |
| `gtin` | string | Optional* | Global Trade Item Number (UPC/EAN/ISBN) |
| `ebay_domain` | string | Optional | eBay domain (default: ebay.com) |
| `url` | string | Optional* | Direct eBay product page URL |

*One of `epid`, `gtin`, or `url` must be provided

### GTIN Lookup Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `skip_gtin_cache` | boolean | Force new GTIN lookup (costs 2 credits instead of 1) |

**Example Product Request**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="product" \
  -d epid="233599133856" \
  -d ebay_domain="ebay.com"
```

**Example GTIN Lookup**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="product" \
  -d gtin="885170202597" \
  -d ebay_domain="ebay.com"
```

---

## 4. Seller Profile Parameters

**Used when**: `type=seller-profile`  
**Purpose**: Get seller profile information and statistics

### Core Seller Profile Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `seller_name` | string | Optional* | eBay seller username |
| `url` | string | Optional* | Direct eBay seller profile page URL |
| `ebay_domain` | string | Optional | eBay domain (default: ebay.com) |

*Either `seller_name` or `url` must be provided

**Example Seller Profile Request**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="seller-profile" \
  -d seller_name="probstein123" \
  -d ebay_domain="ebay.com"
```

---

## 5. Reviews Parameters

**Used when**: `type=reviews`  
**Purpose**: Get customer reviews for a specific product

### Core Reviews Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `epid` | string | Optional* | eBay Product ID |
| `gtin` | string | Optional* | Global Trade Item Number |
| `ebay_domain` | string | Optional | eBay domain (default: ebay.com) |
| `url` | string | Optional* | Direct eBay product page URL |

### Reviews Filtering

| Parameter | Type | Options | Description |
|-----------|------|---------|-------------|
| `sort_by` | string | `most_recent`, `most_helpful`, `highest_rating`, `lowest_rating` | Sort order for reviews |

*One of `epid`, `gtin`, or `url` must be provided

**Example Reviews Request**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="reviews" \
  -d epid="1522036563" \
  -d ebay_domain="ebay.com" \
  -d sort_by="most_recent"
```

---

## 6. Seller Feedback Parameters

**Used when**: `type=seller-feedback`  
**Purpose**: Get feedback data for a specific seller

### Core Seller Feedback Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `seller_name` | string | Optional* | eBay seller username |
| `url` | string | Optional* | Direct eBay seller feedback page URL |
| `ebay_domain` | string | Optional | eBay domain (default: ebay.com) |

*Either `seller_name` or `url` must be provided

**Example Seller Feedback Request**:
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="seller-feedback" \
  -d seller_name="probstein123" \
  -d ebay_domain="ebay.com"
```

---

## Sports Card Pricing Examples

### Example 1: Search for Sold PSA 10 Cards
```bash
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="search" \
  -d search_term="2024 Topps Chrome Caitlin Clark PSA 10" \
  -d sold_items="true" \
  -d completed_items="true" \
  -d sort_by="ending_soonest" \
  -d max_page="5"
```

### Example 2: Get Product Details with Reviews
```bash
# First get product details
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="product" \
  -d epid="274512345678"

# Then get reviews for the same product
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="reviews" \
  -d epid="274512345678" \
  -d sort_by="most_recent"
```

### Example 3: Research Seller Reputation
```bash
# Get seller profile
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="seller-profile" \
  -d seller_name="pwcc_auctions"

# Get seller feedback
curl -L --get https://api.countdownapi.com/request \
  -d api_key="your_api_key" \
  -d type="seller-feedback" \
  -d seller_name="pwcc_auctions"
```

---

## Best Practices

### For Sports Card Pricing Applications

1. **Use Sold Items**: Always include `sold_items=true` and `completed_items=true` for accurate pricing data
2. **Multiple Pages**: Use `max_page=3-5` to get sufficient data points for pricing analysis
3. **Sort by Recency**: Use `sort_by=ending_soonest` to get the most recent sales first
4. **Filter by Condition**: Use appropriate condition filters for graded vs raw cards
5. **Batch Requests**: Use Collections API for large-scale data collection

### Rate Limiting and Optimization

- **Caching**: GTIN-to-EPID mappings are cached for 2 months
- **Collections**: Use for bulk requests (up to 15,000 per collection)
- **Credits**: Each request consumes 1 credit (2 credits with `skip_gtin_cache=true`)
- **Result Sets**: Available for 14 days after collection completion

### Error Handling

Monitor for these HTTP status codes:
- **200**: Success
- **400**: Bad Request (invalid parameters)
- **401**: Unauthorized (invalid API key)
- **402**: Payment Required (credits exhausted)
- **429**: Too Many Requests (rate limited)
- **500**: Internal Server Error (retry recommended)
- **503**: Service Unavailable (maintenance mode)

---

## Support and Documentation

- **Status Page**: Check for incidents and maintenance
- **Rate Limits**: Vary by plan (500-15,000+ requests/month)
- **Support**: Available through the dashboard for technical assistance

This comprehensive parameter guide ensures optimal usage of the API for sports card pricing applications and general eBay data retrieval.