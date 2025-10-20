# 📄 SlabFy Events Feature - Product Requirements Document

## 🎯 Overview

The Events feature enables SlabFy users to discover, track, and manage their participation in sports card shows and events. This feature serves as a foundation for organizing business activities, tracking performance, and measuring event ROI across different venues.

**Core Value Proposition**: Transform event participation from ad-hoc tracking to professional business intelligence.

---

## 🧩 SlabFy Rules Compliance

**This feature strictly follows slabfyrules.md guidelines:**

- **Feature isolation**: Self-contained in `features/events/` with no cross-feature imports
- **File size limit**: Max 200 lines per component file
- **AI documentation**: Every file includes internal comment blocks
- **Named exports only**: No default exports throughout feature
- **TypeScript strict**: Explicit interfaces, no `any` types
- **Design system**: CSS tokens only, shadcn components
- **Feature structure**: Follows standard feature architecture

---

## 📋 User Stories

### Primary User Stories

**US001: Event Discovery**
As a card dealer preparing for shows
I want to search for real upcoming card events
So that I can plan my schedule and prepare inventory

**US002: Event Organization** 
As a busy dealer managing multiple shows
I want to track all my events in one place
So that I can see my schedule and performance at a glance

**US003: Event Performance Tracking**
As a data-driven dealer
I want to see metrics for each event
So that I can identify my most profitable shows

**US004: Quick Event Creation**
As a dealer who attends regular local shows
I want to quickly add custom events
So that I can track shows not in the discovery database

---

## 🏗️ Technical Architecture

### Feature Structure (Following slabfyrules.md)
```
features/
  events/
    components/          # UI components
      event-list/        # Events table and filters
      event-detail/      # Individual event view
      add-event/         # Event creation dialog
      shared/            # Reusable components
    hooks/              # Custom hooks
      use-events.ts      # Data fetching
      use-event-search.ts # External API integration
    utils/              # Pure functions
      date-helpers.ts    # Date formatting
      status-helpers.ts  # Status logic
    types/              # TypeScript definitions
      event-types.ts     # Core interfaces
    api.ts              # Data fetching logic
    index.ts            # Public API exports
    README.md           # Feature documentation
```

### Database Schema (Drizzle)
```typescript
// shared/schema.ts additions
export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  dateStart: date('date_start').notNull(),
  dateEnd: date('date_end'), // nullable for single day
  location: text('location'),
  description: text('description'),
  aiInsights: jsonb('ai_insights'), // Perplexity-generated tips
  status: varchar('status', { length: 50 }).default('upcoming'),
  isCustom: boolean('is_custom').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

---

## 📅 Implementation Phases

### Phase 1: Core Events Foundation (Week 1)
**Goal**: Basic event CRUD with clean UI matching wireframes

#### Features Delivered
- ✅ Events list page with summary cards
- ✅ Event detail page with metrics placeholders  
- ✅ Manual event creation dialog
- ✅ Basic status management (upcoming, active, completed, cancelled)
- ✅ Clean table UI matching wireframe design

#### Technical Tasks
- [ ] Create `events` table schema in Drizzle
- [ ] Build `EventsList.tsx` component with data table
- [ ] Build `EventDetail.tsx` page with metrics cards
- [ ] Build `AddEventDialog.tsx` for manual creation
- [ ] Implement events API endpoints (`GET`, `POST`, `PATCH`, `DELETE`)
- [ ] Add events route to main navigation

#### API Endpoints
```typescript
GET /api/events          // List user events
POST /api/events         // Create new event  
GET /api/events/:id      // Get event details
PATCH /api/events/:id    // Update event
DELETE /api/events/:id   // Delete event
```

#### Success Criteria
- [ ] Create and manage events manually
- [ ] View events in clean table format
- [ ] Basic event detail page displays
- [ ] All CRUD operations work reliably
- [ ] UI matches provided wireframes

---

### Phase 2: Perplexity Event Discovery (Week 2)
**Goal**: Real event discovery with AI-powered insights

#### Features Delivered
- ✅ Smart search integration with Perplexity API
- ✅ Auto-population of event details
- ✅ AI-generated event insights and tips
- ✅ Location-based event filtering
- ✅ Date range search capabilities

#### Technical Tasks
- [ ] Integrate Perplexity API for event search
- [ ] Build `EventSearchDialog.tsx` with real-time search
- [ ] Create `useEventSearch.ts` hook for API integration
- [ ] Add AI insights display in event details
- [ ] Implement location and date filtering
- [ ] Add search results auto-population

#### API Integration
```typescript
// New external API integration
POST /api/events/search   // Search Perplexity for events
GET /api/events/nearby    // Location-based discovery
```

#### Perplexity Integration Strategy
```typescript
// Example search query structure
const searchQuery = `Find sports card shows and conventions in ${location} 
during ${dateRange}. Include venue details, dates, and any special features 
like grading services or major dealers attending.`;
```

#### Success Criteria
- [ ] Search returns real event data
- [ ] Auto-populate works reliably
- [ ] AI insights provide valuable information
- [ ] Location filtering functions properly
- [ ] Search performance under 3 seconds

---

### Phase 3: Event Analytics Foundation (Week 3)
**Goal**: Connect to future Buying Desk system with placeholder analytics

#### Features Delivered
- ✅ Performance metrics cards (with placeholders)
- ✅ Buying Desk integration preparation
- ✅ Revenue and profit tracking structure
- ✅ Event status automation
- ✅ Analytics dashboard layout

#### Technical Tasks
- [ ] Build metrics calculation utilities
- [ ] Create placeholder analytics displays
- [ ] Add event status automation (live detection)
- [ ] Implement analytics hooks structure
- [ ] Build foundation for Buying Desk integration
- [ ] Add export functionality for event data

#### Placeholder Analytics Structure
```typescript
interface EventMetrics {
  totalBuyOffers: number;     // Placeholder: 0 until system exists
  totalSold: number;          // Placeholder: 0 until system exists  
  totalRevenue: number;       // Placeholder: $0 until system exists
  totalProfit: number;        // Placeholder: $0 until system exists
  avgOffer: number;           // Calculated when data available
  conversionRate: number;     // Calculated when data available
}
```

#### Success Criteria
- [ ] Metrics cards display properly
- [ ] Placeholder states are clear
- [ ] Export functionality works
- [ ] Event status updates automatically
- [ ] Foundation ready for Buying Desk integration

---

### Phase 4: Advanced Features & Polish (Week 4)
**Goal**: Production-ready event management with full feature set

#### Features Delivered
- ✅ Bulk operations on events
- ✅ Advanced filtering and search
- ✅ Mobile-optimized interface
- ✅ Event templates for recurring shows
- ✅ Calendar integration preparation

#### Technical Tasks
- [ ] Add bulk selection and operations
- [ ] Implement advanced filtering options
- [ ] Optimize for mobile/tablet use
- [ ] Add event templates system
- [ ] Enhance search with multiple criteria
- [ ] Add keyboard shortcuts for power users

#### Advanced Features
```typescript
// Bulk operations
interface BulkEventOperation {
  action: 'update_status' | 'delete' | 'export';
  eventIds: string[];
  payload?: any;
}

// Event templates
interface EventTemplate {
  name: string;
  defaultLocation: string;
  defaultDuration: number; // days
  recurringPattern?: 'monthly' | 'quarterly' | 'yearly';
}
```

#### Success Criteria
- [ ] Bulk operations work efficiently
- [ ] Mobile interface is fully functional
- [ ] Advanced search provides accurate results
- [ ] Event templates save time for recurring shows
- [ ] Performance remains fast with 100+ events

---

## 🔌 External API Integration

### Perplexity API Integration
```typescript
// Expected Perplexity integration
interface PerplexityEventSearch {
  query: string;
  location?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  maxResults?: number;
}

interface PerplexityEventResult {
  name: string;
  dates: string[];
  location: {
    venue: string;
    address: string;
    city: string;
    state: string;
  };
  description: string;
  features: string[];
  expectedAttendance?: number;
  admissionFee?: string;
  insights: string[]; // AI-generated tips
}
```

### API Rate Limits & Costs
- **Rate Limit**: TBD based on Perplexity plan
- **Cost per search**: TBD based on token usage
- **Fallback strategy**: Manual event creation when API unavailable
- **Caching**: Cache search results for 24 hours to reduce API calls

---

## 🎨 UI/UX Requirements

### Design System Compliance
- **Color tokens**: Use only CSS custom properties from `index.css`
- **Typography**: shadcn classes (`text-sm`, `text-lg`, etc.)
- **Components**: shadcn/ui components throughout
- **Spacing**: Tailwind spacing scale only
- **No hardcoded values**: Colors, spacing, or font sizes

### Responsive Design
- **Desktop**: Full table view with all columns
- **Tablet**: Condensed table with key columns
- **Mobile**: Card-based layout for events list
- **Touch targets**: Minimum 44px for mobile interactions

### Accessibility Requirements
- **Keyboard navigation**: Full keyboard support
- **Screen readers**: Proper ARIA labels
- **Color contrast**: WCAG AA compliance
- **Focus indicators**: Clear focus states

---

## 🧪 Testing Strategy

### Test Coverage Goals
- **70%+ overall coverage**: Lines and branches
- **Unit tests**: All utility functions and hooks
- **Integration tests**: Event CRUD operations
- **Component tests**: Complex UI interactions

### Critical Test Scenarios
```typescript
// Key test cases
describe('Events Feature', () => {
  test('Create event manually')
  test('Search and discover real events')
  test('Update event status automatically')
  test('Delete event with confirmation')
  test('Export event data')
  test('Bulk operations on multiple events')
  test('Mobile interface functionality')
  test('API error handling')
});
```

---

## 📊 Success Metrics

### User Engagement
- **Events created per user per month**: Target 3+
- **Search vs manual creation ratio**: Target 60/40
- **Event detail page engagement**: Target 2+ minutes average
- **Return usage rate**: Target 80% weekly active users

### Technical Performance
- **Page load time**: Under 2 seconds
- **Search response time**: Under 3 seconds
- **API error rate**: Under 2%
- **Mobile usability score**: 90+ on PageSpeed Insights

### Business Value
- **User retention correlation**: Events users vs non-users
- **Feature adoption rate**: Target 40% of active users
- **API cost efficiency**: Target <$0.10 per event discovery
- **Support ticket reduction**: Fewer scheduling conflicts

---

## 🚀 Future Enhancements (Post-MVP)

### Advanced Integration
- **Buying Desk**: Full analytics when available
- **Calendar sync**: Google/Outlook integration
- **Photo attachments**: Event photos and documentation
- **Team collaboration**: Multi-user event management

### Business Intelligence
- **Predictive analytics**: Event performance forecasting
- **Optimal event recommendations**: AI-powered suggestions
- **Seasonal trend analysis**: Historical performance patterns
- **Vendor relationship tracking**: Dealer network insights

---

## 🔐 Security & Environment

### Environment Variables
```bash
# Required for Perplexity integration
PERPLEXITY_API_KEY=sk-...
PERPLEXITY_API_URL=https://api.perplexity.ai

# Optional rate limiting
PERPLEXITY_RATE_LIMIT=100  # requests per hour
PERPLEXITY_CACHE_TTL=86400 # 24 hours in seconds
```

### Security Considerations
- **API key protection**: Never expose in client-side code
- **Rate limiting**: Implement client-side request throttling
- **Input validation**: Sanitize all search queries
- **Error handling**: Graceful degradation when API unavailable

---

## 📈 Definition of Done

### Phase 1 Complete When:
- [ ] Events CRUD operations work reliably
- [ ] UI matches provided wireframes exactly
- [ ] All components follow slabfyrules.md guidelines
- [ ] Test coverage reaches 70%+
- [ ] Mobile interface is fully functional

### Phase 2 Complete When:
- [ ] Perplexity API integration returns real events
- [ ] Search performance is under 3 seconds
- [ ] Auto-population works for all event fields
- [ ] AI insights provide valuable information
- [ ] Error handling covers all API scenarios

### Phase 3 Complete When:
- [ ] Analytics foundation supports future integrations
- [ ] Placeholder states are clear and professional
- [ ] Event status automation works correctly
- [ ] Export functionality covers all data
- [ ] Performance remains fast with large datasets

### Phase 4 Complete When:
- [ ] All advanced features work reliably
- [ ] Mobile optimization is complete
- [ ] Bulk operations handle edge cases
- [ ] Documentation is comprehensive
- [ ] Feature is ready for production deployment

---

*This PRD ensures the Events feature integrates seamlessly with SlabFy's existing architecture while providing immediate value and preparing for future business intelligence capabilities.*