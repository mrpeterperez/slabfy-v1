# Slabfy - Intelligent Sports Card Collection Platform

## Overview
Slabfy is a cutting-edge sports card and collectible management platform designed to help collectors manage their portfolios effectively. It features intelligent data caching, global market intelligence, and comprehensive collection tracking, including PSA slab scanning, real-time pricing data, and advanced AI-powered sales filtering. The platform aims to provide a robust solution for managing and understanding collectible asset portfolios.

## User Preferences
Preferred communication style: Simple, everyday language.
Auth flow preference: Existing users should login without invite codes (only new users need invite codes).
Security focus: Keep code clean and simple while implementing comprehensive security measures to prevent financial loss and data breaches.

## System Architecture
### Frontend
- **Framework**: React 18 with TypeScript and Vite
- **UI Framework**: ShadCN components with Tailwind CSS
- **State Management**: TanStack React Query for server state and caching
- **Routing**: Wouter
- **Authentication**: Supabase Auth

### Backend
- **Runtime**: Node.js with Express.js API server
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Supabase for user management and JWT token validation
- **Edge Functions**: Supabase Edge Functions for PSA API integration and AI processing

### Database Design
Multi-table architecture optimized for data preservation and intelligent caching including Global Assets, User Assets, Sales History, PSA Cert Cache, and a Consignments System reusing existing contacts.

### Key Components & Features
- **Intelligent Caching System**: Optimizes API calls and data refreshing based on liquidity.
- **PSA Integration System**: Comprehensive PSA slab scanning, metadata management, and certificate lookup.
- **AI-Powered Sales Filtering**: Utilizes GROQ AI (Llama 3.1) for intelligent filtering of eBay sales data.
- **Asset Creation & Management Flow**: Streamlined process from scanning to global asset linking and user-asset relationship establishment.
- **Sales Data Pipeline**: Fetches, filters, deduplicates, and caches eBay sales data.
- **Authentication Flow**: Supabase handles user registration, login, and secure route protection, including Google OAuth. Smart auth logic distinguishes between new and existing users - existing users can login without invite codes.
- **Invite-Only Registration System**: Secure invite code system prevents unauthorized signups during production rollout. Features rate limiting, admin management, and automatic expiration handling. Only applies to new user registration, not existing user login.
- **Ownership Detection System**: Prevents duplicate asset additions with intelligent pre-scan checks.
- **Portfolio Management**: Features like Portfolio V2 with bulk actions, sortable columns, and real-time market data. Includes a comprehensive portfolio summary API endpoint aggregating asset values. Enhanced with Unrealized Gain column showing profit/loss calculations in both dollar amounts and percentages with proper color coding.
- **Enhanced Consignments System**: Complete consignment management with asset tracking, revenue calculations, and profit analytics. Features include consignor contact management, real-time asset aggregations (totalAssets, totalValue, pipelineValue, potentialProfit), and optimized API endpoints for both list and individual consignment summaries.
- **Collections System**: Allows users to organize both personal and consignment assets with thumbnail image support via Supabase collection-images bucket.
- **Manual Asset Entry & Editing**: Enhanced features including multi-image upload, image compression, and robust editing capabilities.
- **User Preferences Persistence**: LocalStorage persistence for user settings like privacy toggles, view modes, filter states, and sidebar collapsed preferences.

### UI/UX Decisions
- Consistent design using ShadCN components and Tailwind CSS with a unified responsive layout.
- Standardized header, tab styling, and dynamic breadcrumb navigation.
- Professional financial platform time controls and enhanced confidence meter UI.
- Animated portfolio value display with privacy toggle for sensitive financial information.

### System Design Choices
- Modular architecture with clear separation of concerns.
- Sequential processing with staggered delays for API calls.
- Robust error handling, null checking, and validation.
- Focus on data consistency and accuracy.
- Simplified portfolio architecture with `card_id` fingerprints for efficient grouping.
- Clean database design for business relationships (contacts, consignors, consignments) supporting multi-role contacts.

## External Dependencies
### Third-Party APIs
- **PSA API**: Certificate metadata and population data.
- **Countdown API**: eBay marketplace sales data.
- **GROQ API**: AI-powered sales data filtering.
- **Supabase**: Authentication, database, and edge functions.

### Key Libraries
- **Drizzle ORM**: Type-safe database operations.
- **TanStack React Query**: Server state management.
- **Zod**: Runtime type validation.
- **ShadCN**: UI component library.
- **Tailwind CSS**: Utility-first styling.
- **Wouter**: Lightweight client-side routing.
- **TradingView Lightweight Charts**: Interactive charting library.

## Deployment & Production

### Branch Strategy
- **MAIN Branch**: Production-ready code, connected to production database and API keys
- **DEVELOP Branch**: Development features, connected to development database

### Security Audit Completed (January 2025)
**Status**: ✅ COMPLETED - All critical vulnerabilities resolved

**Fixed Critical Vulnerabilities**:
- **SQL Injection (HIGH)**: Replaced raw SQL with parameterized Drizzle ORM queries in buy-mode.ts
  - Fixed variable naming conflict between table reference and request data variable
  - Ensured all database operations use type-safe Drizzle ORM queries
- **Timing Attack (HIGH)**: Replaced unsafe string comparisons with cryptographically secure timing-safe comparisons in swagger.ts
  - Fixed password comparison vulnerability that could allow brute-force attacks through timing analysis
  - Implemented Node.js crypto.timingSafeEqual() for constant-time authentication token verification
  - Applied fix to both query parameter and Bearer token authentication methods
- **Exposed Secrets (HIGH)**: Removed development files containing API key patterns from git history
  - Deleted pasted development files that contained hardcoded API key usage examples
  - Removed Supabase function development files that triggered security scanner alerts
  - All production code uses proper environment variable references for sensitive data
- **Missing Authentication (HIGH)**: Added authenticateUser middleware to unprotected routes:
  - `/api/consignments` - Now requires authentication for all operations
  - `/api/invite-codes` - Admin operations protected with authentication
  - `/api/global-assets/:certNumber` - Asset access requires authentication
  - `/api/user/preferences` - User preferences protected
- **Authorization Bypass (HIGH)**: Fixed cross-user access vulnerabilities:
  - Avatar upload route now validates user owns the profile being updated
  - User profile routes enforce user can only access their own data
- **File Upload Security (MEDIUM-HIGH)**: Enhanced avatar upload validation:
  - Server-side MIME type validation (JPEG, PNG, GIF only)
  - File size limits enforced (5MB maximum)
  - Input sanitization for file metadata
- **Missing Authentication (HIGH)**: Added authenticateUser middleware to unprotected routes:
  - `/api/consignments` - Now requires authentication for all operations
  - `/api/invite-codes` - Admin operations protected with authentication
  - `/api/global-assets/:certNumber` - Asset access requires authentication
  - `/api/user/preferences` - User preferences protected
- **Authorization Bypass (HIGH)**: Fixed cross-user access vulnerabilities:
  - Avatar upload route now validates user owns the profile being updated
  - User profile routes enforce user can only access their own data
- **File Upload Security (MEDIUM-HIGH)**: Enhanced avatar upload validation:
  - Server-side MIME type validation (JPEG, PNG, GIF only)
  - File size limits enforced (5MB maximum)
  - Input sanitization for file metadata

**Security Enhancements Implemented**:
- Input validation and sanitization across all user-facing endpoints
- Rate limiting already in place via server/index.ts
- Comprehensive null coalescing fixes in invite-codes system
- Authentication middleware consistently applied to sensitive operations
- Zod schema validation preventing malformed data injection

**Security Architecture**:
- Supabase authentication with JWT token validation
- Drizzle ORM preventing SQL injection through parameterized queries
- Express rate limiting protecting against abuse
- File upload restrictions preventing malicious file execution
- Authorization checks ensuring users can only access their own data

### Production Readiness Status
- **Authentication**: JWT Bearer tokens via Supabase ✅
- **Invite System**: Secure invite-only registration with admin management ✅
- **API Documentation**: Swagger UI with AUTHENTICATION REQUIRED for security ✅
- **Security**: Helmet, rate limiting, CORS configuration, environment validation ✅
- **Database Security**: Invite codes table with proper constraints ✅
- **Secrets Management**: Production environment variables configured ✅
- **API Security**: Production endpoints secured, docs require SWAGGER_DOCS_KEY ✅

**CRITICAL SECURITY FIX APPLIED**: API documentation now requires authentication to prevent unauthorized access to endpoint information. Production server URLs removed from public documentation.

Ready for secure production deployment to share with 3 initial customers. See `SECURITY_CHECKLIST.md` for full security verification and `INVITE_SYSTEM_IMPLEMENTATION.md` for admin workflows.