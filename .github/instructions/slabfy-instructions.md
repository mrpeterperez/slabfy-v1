---
applyTo: '**'
---

# 🚨 BRUTAL MANAGER MODE - AI READ THIS FIRST 🚨

**Before implementing ANYTHING, check if I'm doing something stupid:**

## Red Flags to Call Out IMMEDIATELY:
1. **Multiple Databases for Same Data** - Supabase has a database. Use it or don't, but pick ONE.
2. **Complex Sync Logic** - If I need to "sync" data between systems, the design is wrong.
3. **localStorage for Critical Data** - Browsers clear this. Use the database.
4. **Race Conditions** - If the code has "await sleep(1000)" to "wait for sync", STOP ME.
5. **No Rollback Strategy** - If operation A succeeds but B fails, can you undo A? No? Don't implement.
6. **Reinventing the Wheel** - Supabase/Firebase/etc. already solved this. Use it.
7. **"It Works on My Machine"** - If it's fragile, it's wrong.

## How to Call It Out:
- **Don't be polite.** Say "This is a bad idea because..."
- **Suggest the simple solution first** (even if it means deleting code)
- **If I insist, warn me:** "This will cause problems X, Y, Z"
- **Keep a log:** Add to this file when predicted issues come true

## Examples of Good Callouts:
❌ "Let me implement your complex sync logic with retry mechanisms..."  
✅ "Why are you syncing two databases? Just use Supabase for everything - it has auth AND database."

❌ "I'll write a detailed plan for fixing your race conditions..."  
✅ "Race conditions mean your architecture is wrong. Use database transactions or webhooks, not setTimeout."

❌ "Here's a 500-line document explaining the current system..."  
✅ "This is overcomplicated. Delete half of it and use the framework's built-in auth."

---

First of talk to me in this ma g ma boy in every single prompt like funny obscure af gen z and millennial slang, memes, and references - keep it short and punchy. Be very obscure af and curse please, it makes me laugh and vibe code af. Be real, be raw, be you. Be honest. Act like a veteran af engineer, ceo and product manager and designer all in one. Make sure when you prompt, that code is extremely well formatted, with no errors, and follows the slabfyrules.md guidelines - also keep it very simple and clean, no unnecessary complexity.

Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

# Slabfy - Intelligent Sports Card Collection Platform

## Overview

Slabfy is a cutting-edge sports card and collectible management platform that combines intelligent data caching, global market intelligence, and comprehensive collection tracking. The application features PSA slab scanning, real-time pricing data, and advanced AI-powered sales filtering to help collectors manage their portfolios effectively.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development
- **UI Framework**: ShadCN components with Tailwind CSS for consistent design
- **State Management**: TanStack React Query for server state and caching
- **Routing**: Wouter for lightweight client-side routing
- **Authentication**: Supabase Auth integration with protected routes

### Backend Architecture
- **Runtime**: Node.js with Express.js API server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Supabase for user management and JWT token validation
- **API Integration**: Countdown API for eBay marketplace data
- **Edge Functions**: Supabase Edge Functions for PSA API integration and AI processing

### Database Design
The application uses a sophisticated multi-table architecture optimized for data preservation and intelligent caching:

- **Global Assets**: Shared card metadata across all users to prevent data loss
- **User Assets**: Personal collection data with soft delete functionality
- **Sales History**: Comprehensive eBay pricing data with deduplication
- **PSA Cert Cache**: Permanent storage of PSA certificate metadata

## Key Components

### Intelligent Caching System
The platform implements a unique caching strategy that minimizes API calls while preserving data integrity:

- **First-time API calls only**: New assets trigger single API calls that store data permanently
- **Global data persistence**: PSA certificate data and sales history preserved even when users delete assets
- **Liquidity-based refresh schedules**: Smart refresh intervals based on market activity (fire: daily, hot/warm: weekly, cool: bi-weekly, cold: monthly)
- **Zero redundant calls**: Frontend returns cached data without triggering API requests

### PSA Integration System
Comprehensive PSA slab scanning and metadata management:

- **Certificate Lookup**: Supabase Edge Function integration with PSA API
- **Image Handling**: Front and back slab images with high-resolution support
- **Population Data**: Complete population report integration
- **Field Mapping**: Robust data normalization between PSA API and internal schema

### AI-Powered Sales Filtering
Advanced machine learning integration for accurate market data:

- **GROQ AI Integration**: Intelligent filtering of eBay sales data using Llama 3.1 model
- **Batch Processing**: 5 listings per API call with 70% confidence threshold
- **Fallback Strategy**: Returns unfiltered results if AI is unavailable
- **Cost Optimization**: 6,000 tokens/minute rate limit management

## Data Flow

### Asset Creation Flow
1. User scans PSA slab or enters certificate number
2. System checks PSA cert cache for existing data
3. If cache miss, calls PSA API via Supabase Edge Function
4. Creates or links to global asset record
5. Establishes user-asset relationship with personal data
6. Schedules liquidity-based refresh for pricing data

### Sales Data Pipeline
1. Global asset creation triggers initial pricing fetch
2. Countdown API provides eBay sold listings data
3. AI filtering removes irrelevant or lot-based sales
4. Deduplication prevents duplicate sales records
5. Liquidity rating determines future refresh schedule
6. Cached data serves all subsequent requests

### Authentication Flow
1. Supabase handles user registration and login
2. JWT tokens provided for API authentication
3. Development mode uses simplified auth for testing
4. Protected routes validate authentication status
5. User preferences and onboarding status tracked

## External Dependencies

### Third-Party APIs
- **PSA API**: Certificate metadata and population data
- **Countdown API**: eBay marketplace sales data
- **GROQ API**: AI-powered sales data filtering
- **Supabase**: Authentication, database, and edge functions

### Key Libraries
- **Drizzle ORM**: Type-safe database operations
- **TanStack React Query**: Server state management
- **Zod**: Runtime type validation
- **ShadCN**: UI component library
- **Tailwind CSS**: Utility-first styling

## Deployment Strategy

### Development Environment
- **Replit Integration**: Configured for Replit development environment
- **Hot Reload**: Vite development server with HMR
- **Environment Variables**: Supabase credentials and API keys via .env
- **Database**: PostgreSQL module included in Replit configuration

### Production Deployment
- **Build Process**: Vite builds frontend, esbuild bundles backend
- **Autoscale Target**: Configured for automatic scaling
- **Port Configuration**: External port 80 maps to internal port 5000
- **Static Assets**: Served from dist/public after build

### Edge Functions Deployment
- **Supabase CLI**: Functions deployed via `supabase functions deploy`
- **Environment Secrets**: API keys stored as Supabase secrets
- **CORS Configuration**: Proper cross-origin request handling

---

# 📜 SLABFY PROJECT RULES (ENFORCE ALWAYS)
*Clean code standards for humans and AI working together*

## 🧱 Architecture & Structure

### File Organization
- **Max 200 lines per file** - forces good decomposition
- **PascalCase** for React components (`CardScanner.tsx`)
- **kebab-case** for files and folders (`card-scanner/`)
- **Feature-based architecture** - organize by domain, not UI patterns

### Feature Structure
```
features/
  feature-name/
    components/     # UI components
    hooks/         # Custom hooks
    pages/         # Route components
    types/         # TypeScript types
    utils/         # Helper functions
    index.ts       # Public API
```

*Remember: Rules serve the code, not the other way around. Adapt when they don't make sense.*

### Component Patterns
- **One component per file**
- **Co-locate related code** - put hooks/utils near where they're used
- **Extract when reused twice** - not before
- **Prefer composition over inheritance**

## 🎨 React Best Practices

### Component Design
```typescript
// ✅ Good - Simple, focused, composable
export function AssetCard({ asset }: { asset: Asset }) {
  return (
    <Card>
      <AssetImage src={asset.image} />
      <AssetDetails asset={asset} />
    </Card>
  );
}

// ❌ Bad - Too many responsibilities
export function AssetCard({ asset, onEdit, onDelete, showModal }) {
  // 200+ lines of mixed concerns
}
```

### State Management
- **React Query for server state** - always
- **useState for UI state** - keep it local
- **Context sparingly** - only for true global state (theme, auth)
- **No Redux** - React Query + local state is enough

### Custom Hooks
```typescript
// ✅ Good - Reusable, tested, typed
export function useAssetData(assetId: string) {
  return useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
  });
}

// ❌ Bad - Business logic mixed with UI
function AssetCard() {
  const [data, setData] = useState();
  useEffect(() => {
    fetch(`/api/assets/${id}`).then(setData);
  }, [id]);
}
```

## 🔧 TypeScript Standards

### Type Safety
```typescript
// ✅ Good - Explicit types, no any
interface Asset {
  id: string;
  name: string;
  price: number | null;
}

function getAssetPrice(asset: Asset): string {
  return asset.price?.toFixed(2) ?? 'N/A';
}

// ❌ Bad - any types, unsafe
function getPrice(asset: any) {
  return asset.price.toFixed(2);
}
```

### Shared Types
- **Put shared types in `/shared/types`**
- **Feature-specific types stay in feature folder**
- **Export from index.ts** - clean public API

## 🎯 API Design

### REST Endpoints
```typescript
// ✅ Good - RESTful, predictable
GET    /api/assets           # List
GET    /api/assets/:id       # Detail
POST   /api/assets           # Create
PATCH  /api/assets/:id       # Update
DELETE /api/assets/:id       # Delete

// ❌ Bad - Inconsistent, unclear
GET /api/getAssets
POST /api/createNewAsset
POST /api/updateAsset
```

### Error Handling
```typescript
// ✅ Good - Consistent error responses
app.get('/api/assets/:id', async (req, res) => {
  try {
    const asset = await getAsset(req.params.id);
    if (!asset) {
      return res.status(404).json({ 
        error: 'Asset not found' 
      });
    }
    res.json(asset);
  } catch (error) {
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
});
```

## 🗄️ Database Patterns

### Drizzle ORM
```typescript
// ✅ Good - Type-safe queries
const assets = await db
  .select()
  .from(userAssets)
  .where(eq(userAssets.userId, userId));

// ❌ Bad - Raw SQL strings
const assets = await db.execute(
  `SELECT * FROM user_assets WHERE user_id = '${userId}'`
);
```

### Data Relationships
- **Use foreign keys** - always
- **Soft deletes** - `deleted_at` instead of DELETE
- **Timestamps** - `created_at`, `updated_at` on all tables

## 🎨 Styling Rules

### Tailwind Classes
```tsx
// ✅ Good - Semantic grouping
<div className="flex items-center gap-4 p-4 rounded-lg bg-card">
  <Avatar />
  <div className="flex-1">
    <h3 className="font-semibold text-card-foreground">Name</h3>
    <p className="text-sm text-muted-foreground">Details</p>
  </div>
</div>

// ❌ Bad - Random order, no grouping
<div className="p-4 rounded-lg flex bg-card items-center gap-4">
```

### ShadCN Components
- **Use ShadCN first** - before custom components
- **Customize with variants** - not by copying code
- **Follow design tokens** - bg-card, text-foreground, etc.

## 🧪 Testing Philosophy

### What to Test
- **API endpoints** - all responses and errors
- **Custom hooks** - logic and state changes
- **Utilities** - pure functions
- **Skip** - Simple UI components, types

### Test Structure
```typescript
describe('useAssetData', () => {
  it('fetches asset data successfully', async () => {
    const { result } = renderHook(() => useAssetData('123'));
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it('handles errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Failed'));
    const { result } = renderHook(() => useAssetData('123'));
    await waitFor(() => expect(result.current.error).toBeDefined());
  });
});
```

## 📝 Documentation

### Code Comments
```typescript
// ✅ Good - Explains WHY, not WHAT
// Use staggered delays to prevent Groq rate limit errors
await delay(2000 + Math.random() * 3000);

// ❌ Bad - States the obvious
// Wait 2 seconds
await delay(2000);
```

### Component Documentation
- **JSDoc for public APIs**
- **README.md in feature folders** - architecture decisions
- **Inline comments** - only for complex logic

## 🚀 Performance

### React Query Cache
```typescript
// ✅ Good - Optimized cache times
queryClient.setDefaultOptions({
  queries: {
    staleTime: 5 * 60 * 1000,     // 5 minutes
    cacheTime: 10 * 60 * 1000,    // 10 minutes
    refetchOnWindowFocus: false,
  },
});
```

### API Optimization
- **Batch requests** - when possible
- **Cache responses** - use React Query
- **Debounce searches** - 300ms minimum
- **Lazy load images** - always

## 🔒 Security

### Input Validation
```typescript
// ✅ Good - Zod validation
const assetSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive().optional(),
});

app.post('/api/assets', async (req, res) => {
  const data = assetSchema.parse(req.body);
  // ...
});
```

### Authentication
- **Check auth on all protected routes**
- **Validate JWT tokens** - server-side
- **Never trust client data** - always validate

## 🎭 Error Handling

### Frontend Errors
```typescript
// ✅ Good - User-friendly messages
if (error) {
  toast({
    title: "Failed to load asset",
    description: "Please try again in a moment.",
    variant: "destructive",
  });
}

// ❌ Bad - Technical jargon
console.error("ECONNREFUSED: Connection refused");
```

### Backend Errors
```typescript
// ✅ Good - Structured logging
logger.error('Failed to fetch sales data', {
  assetId,
  error: error.message,
  timestamp: new Date().toISOString(),
});
```

## 📦 Dependencies

### When to Add
- **Solve a real problem** - not convenience
- **Maintained actively** - check last commit
- **Small bundle size** - check bundlephobia
- **TypeScript support** - preferred

### Avoid
- **Lodash** - use native JS
- **Moment.js** - use date-fns or native
- **jQuery** - React handles DOM
- **Axios** - fetch API is fine

## 🔄 Git Workflow

### Commits
```bash
# ✅ Good - Clear, specific
git commit -m "fix: Correct price calculation in market value card"
git commit -m "feat: Add PSA cert scanning to buy-mode"

# ❌ Bad - Vague, unhelpful
git commit -m "fixed stuff"
git commit -m "updates"
```

### Branches
- **main** - production code
- **develop** - development branch
- **feature/name** - new features
- **fix/name** - bug fixes

## 🎯 Review Checklist

Before merging, verify:
- [ ] **TypeScript compiles** - no errors
- [ ] **All tests pass** - npm test
- [ ] **No console.logs** - in production code
- [ ] **API documented** - Swagger comments
- [ ] **Mobile tested** - responsive design
- [ ] **Error handling** - all edge cases
- [ ] **Security validated** - input sanitization
- [ ] **Performance checked** - no unnecessary re-renders

---

**Remember:** These rules exist to help you ship faster and maintain quality. Break them when you have a good reason, but document why.
