# Edge Function Maintenance Guide

## Dependency Management Strategy

### Problem
Deno frequently updates their standard library, breaking functions that import specific versions like `@0.168.0`.

### Solution: Centralized Dependencies
All functions now import from `_shared/deps.ts` instead of direct Deno URLs.

**Before (Fragile):**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"; // Breaks when deprecated
```

**After (Resilient):**
```typescript
import { serve } from "../_shared/deps.ts"; // Single point of maintenance
```

### Benefits
1. **Single Update Point**: Change version once in `deps.ts`, all functions inherit
2. **Lock File Protection**: `deno.lock` freezes exact versions
3. **Batch Testing**: Test all functions together when updating versions
4. **Rollback Safety**: Easy to revert to working versions

### Maintenance Schedule
- **Monthly Check**: Verify functions still work
- **Planned Updates**: Update `deps.ts` during low-traffic periods
- **Emergency Fixes**: Hot-fix `deps.ts` if Deno breaks compatibility

### Monitoring
Set up alerts for:
- Function execution failures
- Timeout increases
- HTTP 500 errors from edge functions

### Update Process
1. Update version in `_shared/deps.ts`
2. Test locally: `deno task test`
3. Deploy to staging: `supabase functions deploy --no-verify-jwt`
4. Run smoke tests
5. Deploy to production

This approach prevents surprise breakages and reduces maintenance from "constant firefighting" to "planned updates."