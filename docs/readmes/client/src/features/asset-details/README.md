# Asset Details Feature

## Purpose
This feature provides a detailed view of a single asset in the collection, showing all information about the asset and allowing for editing and deletion.

## Components
- `AssetDetailPage`: Main component for displaying asset details
- `DetailItem`: Reusable component for displaying a labeled value

## Utilities
- `formatters.ts`: Contains helper functions for formatting values, currency, and dates

## Dependencies
- Shared libraries: 
  - `@/components/ui/*`: UI components from ShadCN
  - `@/components/header`: App header component
  - `@/hooks/use-toast`: Toast notification hook
  
- Features:
  - `@/features/add-asset/api/asset-api`: API functions for asset CRUD operations
  - `@/features/add-asset/components/edit-asset-dialog`: Dialog for editing assets

## Usage
This feature is used as a page component for the `/assets/:id` route in the application.



# Sports Card Asset Management Platform: Feature Outline

## Overview
A comprehensive platform for sports card collectors to track, manage, analyze, and trade their graded card assets with a focus on real-time market data, portfolio analytics, and in-person transaction facilitation. The platform exclusively supports graded cards from established grading companies (PSA, BGS, SGC, etc.).

## Core Features

### 1. Asset Dashboard
- **Slab Visualization**: High-quality display of graded slabs from all major grading companies (PSA, BGS, SGC, etc.) with certification information
- **Real-time Pricing**: Robinhood-style price charts showing asset value over time (1D, 1W, 1M, 3M, YTD, 1Y, ALL)
- **Market Indicators**: Visual representation of price movements with percentage change
- **Historical Data**: Timeline showing significant price movements and purchase dates

### 2. AI Market Sentiment Analysis
- **Trend Identification**: AI-powered insights showing "Bullish," "Bearish," or "Neutral" market sentiment
- **Player Performance Impact**: Analysis of how on-field/on-court performance translates to collector interest
- **Collector Activity Metrics**: Tracking spikes in PSA grading submissions and auction activity
- **Supply/Demand Indicators**: Assessment of market depth and scarcity factors

### 3. Asset Management
- **Multi-Grader Support**: Support for all major grading companies (PSA, BGS, SGC, etc.)
- **Portfolio Aggregation**: Consolidation of identical cards with same grade under a single asset view
- **Individual Certificate Tracking**: Detailed breakdown of each certification number in your inventory
- **Performance Metrics**: 
  - Purchase price vs. current value
  - Return percentage (e.g., +181.3%)
  - Holding period data (days owned)
  - Total portfolio cost and value

### 4. Transaction Processing
- **In-person Sale Facilitation**: 
  - Customizable sell price with real-time market comparison
  - Quantity adjustment for multiple card sales
  - Net profit calculation and visualization
  - Transaction review interface
- **Flexible Payment Options**:
  - Cash transactions
  - Credit card processing
  - Card-for-card trades
  - Hybrid payment methods (card + cash)

### 5. Asset Details
- **Card Information**:
  - Player name
  - Year of issue
  - Set name (e.g., Bowman U Now)
  - Rookie card identification
- **Grading Information**:
  - Grading company (PSA, BGS, SGC, etc.)
  - Grade level with visual identification (e.g., PSA 10 - Gem Mint, BGS 9.5)
  - Certification IDs with verification
  - Population data (e.g., 289 PSA 10s, 3.2% of total population)
- **Manual Entry Support**:
  - Option to manually add certification details if not automatically fetched
  - Custom slab photo uploads when API images are unavailable

### 6. Market Analytics
- **Pricing History**: Comprehensive tracking of price movements
- **Market Value Assessment**: Current value based on real-time data
- **Investment Performance**:
  - All-time high price records ($72.50 on March 18, 2025)
  - ROI calculation (5.6x)
  - Potential profit projections ($92.50, +462%)

### 7. Collection Insights
- **Population Context**: Where your card sits in relation to the total graded population across all grading companies
- **Rarity Assessment**: Percentage of similar cards at the same grade level
- **Cross-Grader Comparison**: Population and value comparisons between different grading companies
- **Market Position**: Peak price history and current position relative to all-time high

## Technical Implementation
- **Multi-Grader API Integration**: Connection to PSA, BGS, SGC, CSG and other grading company databases for slab images and certification verification
- **Pricing Algorithm**: Real-time data aggregation from eBay and other marketplaces
- **Responsive Design**: Full functionality across desktop and mobile interfaces
- **Scanning Technology**: Quick asset identification for in-person transactions

## User Experience Flow
1. Users add cards to their collection (manual entry or API import from PSA)
2. Platform automatically tracks market value and portfolio performance
3. AI provides ongoing sentiment analysis and market intelligence
4. When selling, users can quickly process in-person transactions with flexible payment options
5. Transaction history and performance metrics are automatically updated

## Future Enhancements
- Price alerts based on significant market movements
- Cross-grader comparison tools and crossover potential analytics
- Advanced portfolio analytics and diversification recommendations
- Scheduled selling/trading recommendations based on market conditions
- Grading submission tracking and projected ROI calculations