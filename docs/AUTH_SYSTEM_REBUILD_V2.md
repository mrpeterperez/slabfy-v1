# 🔐 Auth System Rebuild V2 - Clean Architecture Plan

## 🎯 Current State & Problems

### What's Broken
- **Invite code validation** works but flow is scattered across multiple files
- **Auth flow** is complex with multiple localStorage/sessionStorage checks
- **Error handling** inconsistent across sign-in/sign-up
- **Email confirmation** flow has race conditions
- **User sync** (`/api/auth/sync`) gets called multiple places
- **Rate limiting** on invite codes only works in production
- **File organization** - auth pages scattered in `/pages` instead of organized

### What's Working (Keep This)
- ✅ **InviteGate UI** - clean, professional look
- ✅ **Rate limiting logic** - just needs tweaking
- ✅ **Database schema** - `invite_codes` table is solid
- ✅ **Supabase integration** - auth provider works
- ✅ **Resend email setup** - already configured
- ✅ **Onboarding flow** - separate feature, don't touch

---

## 🏗️ New Architecture

### File Structure
```
client/src/
  features/
    auth/                          # NEW - All auth logic here
      components/
        sign-in-form.tsx           # Clean sign-in form
        sign-up-form.tsx           # Clean sign-up form  
        invite-code-form.tsx       # Invite validation form
        password-reset-form.tsx    # Reset password form
        email-confirmation-banner.tsx
      hooks/
        use-auth-form.ts           # Shared form logic
        use-invite-validation.ts   # Invite code validation hook
      utils/
        auth-storage.ts            # Centralized localStorage/sessionStorage
        auth-errors.ts             # Error messages & handling
      types.ts                     # Auth types
      config.ts                    # Auth config (timeouts, limits)
      README.md                    # Feature docs
      index.ts                     # Public exports
    
    invite-system-v2/              # NEW - Clean invite system
      (migrate current invite-system here, simplified)
    
    onboarding/                    # KEEP AS-IS
      (don't touch - works fine)
  
  pages/
    auth/                          # NEW - All auth pages
      sign-in.tsx                  # Route: /auth/sign-in
      sign-up.tsx                  # Route: /auth/sign-up
      invite-gate.tsx              # Route: /auth/invite
      check-email.tsx              # Route: /auth/check-email
      email-confirmed.tsx          # Route: /auth/email-confirmed
      reset-password.tsx           # Route: /auth/reset-password
    
    dashboard.tsx                  # Keep
    (other pages...)

server/
  routes/
    auth/
      index.ts                     # User sync endpoint
      invite-codes.ts              # Invite validation/usage
      (keep current structure, just clean up)
```

---

## 🔄 New Flow - Step by Step

### 1️⃣ User Lands on Sign In (`/auth/sign-in`)
```
User sees:
- Email/password form
- "Forgot password?" link
- Google sign-in button
- "Don't have an account? Create one" → /auth/sign-up
```

**What happens:**
- Simple, clean form
- On submit → Supabase `signIn()`
- Success → redirect to `/dashboard`
- Error "email not confirmed" → show resend banner
- Error "invalid creds" → inline error message

---

### 2️⃣ User Clicks "Create One" → Invite Gate (`/auth/sign-up`)
```
User sees:
- Invite code input (8-char, uppercase, clean UI)
- "Enter your invite code" message
- Rate limit: 10 attempts per 15 min
```

**What happens:**
1. User enters code (e.g., `SLABFY01`)
2. Clicks "Continue"
3. Frontend calls `POST /api/invite-codes/validate`
   - **Server checks:** exists, active, not expired, not exhausted
   - Returns `{ isValid: true }` or `{ isValid: false, error: "..." }`
4. If valid:
   - Store code in `authStorage.setInviteCode(code)`
   - Show sign-up form (fade in transition)
5. If invalid:
   - Show error toast
   - Clear input
   - Increment rate limit counter

**Security:**
- Rate limiting tracked server-side by IP
- After 10 failed attempts → 15min cooldown
- Client shows countdown timer during cooldown

---

### 3️⃣ Sign Up Form (Same Page After Invite Validation)
```
User sees:
- Email input
- Password input (min 6 chars)
- "Create Account" button
- Google sign-in option
- "Already have an account? Sign in"
```

**What happens:**
1. User fills email/password
2. Clicks "Create Account"
3. Frontend validates form
4. Calls Supabase `signUp(email, password)`
5. Supabase sends confirmation email
6. Store in `authStorage`:
   - `setSigningUp(true)`
   - `setSignupEmail(email)`
   - Keep `inviteCode` stored from step 2
7. Redirect → `/auth/check-email`

**Error Handling:**
- "User already exists" → toast + redirect to `/auth/sign-in`
- "Weak password" → inline error under password field
- Network error → toast with retry button

---

### 4️⃣ Check Email Page (`/auth/check-email`)
```
User sees:
- "Check your email" message
- Email address displayed (from storage)
- "Resend confirmation" button (60s cooldown)
- "Back to sign in" link
- "Try different email" link
```

**What happens:**
- User waits for email
- Can resend (with cooldown)
- Email contains magic link to `/auth/email-confirmed?token=...`

---

### 5️⃣ Email Confirmed Page (`/auth/email-confirmed`)
```
This page handles the magic link callback from email
```

**What happens:**
1. Page loads with Supabase auth token in URL
2. Supabase auto-signs user in
3. Frontend calls `POST /api/auth/sync`:
   ```json
   {
     "id": "supabase-user-id",
     "email": "user@example.com", 
     "inviteCode": "SLABFY01"
   }
   ```
4. **Server checks:**
   - User exists? → return user data
   - User doesn't exist? → validate invite code again:
     - Check: valid, active, not expired, not exhausted
     - Create user in DB
     - **Mark invite code as used** (atomic update)
     - Return user data
5. Clear all temp storage:
   - `authStorage.clearInviteCode()`
   - `authStorage.clearSignupEmail()`
   - `authStorage.clearSigningUp()`
6. Show success message
7. Redirect → `/onboarding/step1` (existing onboarding flow)

**Error Handling:**
- Invalid invite code → error message + "Contact support"
- Code exhausted (race condition) → error + "Request new code"
- Network error → retry button

---

### 6️⃣ User Completes Onboarding
```
Existing onboarding flow (don't change):
- Step 1: Username
- Step 2: Collections
- Step 3: Done
- Redirect → /dashboard
```

---

## 🛡️ Security Improvements

### Rate Limiting (Enhanced)
```typescript
// New config (works in dev & prod)
const RATE_LIMIT_CONFIG = {
  maxAttempts: 10,
  windowMinutes: 15,
  enableInDev: true, // Allow testing but log warnings
}

// Track by IP + user agent for better security
const rateKey = `${ip}-${userAgent}`;
```

### Invite Code Protection
- Codes auto-uppercase on input
- Trim whitespace
- Max 50 chars (flexible for future)
- Server validates every request (never trust client)

### Session Security
- Use `sessionStorage` for temporary (invite validation)
- Use `localStorage` only for persistent (invite code during email confirmation)
- Clear all auth storage on sign-out
- Clear temp storage after successful signup

---

## 🎨 UI/UX Improvements

### Consistent Design
- All auth pages use same layout/styling
- Logo + heading centered
- Max width: 480px (sm:max-w-sm)
- Consistent button styles
- Same error/success toast patterns

### Loading States
```tsx
// Consistent loading spinner across all forms
<Button disabled={isLoading}>
  {isLoading ? (
    <span className="flex items-center gap-2">
      <Spinner />
      Loading...
    </span>
  ) : "Submit"}
</Button>
```

### Error Messages
```typescript
// Centralized error messages
const AUTH_ERRORS = {
  INVITE_INVALID: "Invalid invite code. Please check and try again.",
  INVITE_EXPIRED: "This invite code has expired. Please request a new one.",
  INVITE_EXHAUSTED: "This invite code has been used. Please request a new one.",
  RATE_LIMITED: "Too many attempts. Please wait 15 minutes.",
  EMAIL_EXISTS: "An account with this email already exists. Please sign in.",
  WEAK_PASSWORD: "Password must be at least 6 characters.",
  // ... more
}
```

---

## 📦 Data Storage Strategy

### Use `authStorage` Utility
```typescript
// features/auth/utils/auth-storage.ts
export const authStorage = {
  // Invite Code (persists through email confirmation)
  setInviteCode: (code: string) => localStorage.setItem('slabfy_invite_code', code),
  getInviteCode: () => localStorage.getItem('slabfy_invite_code'),
  clearInviteCode: () => {
    localStorage.removeItem('slabfy_invite_code');
    sessionStorage.removeItem('slabfy_invite_code');
  },
  
  // Signup Flow (temporary)
  setSigningUp: (value: boolean) => 
    value ? localStorage.setItem('slabfy_signing_up', 'true') 
          : localStorage.removeItem('slabfy_signing_up'),
  isSigningUp: () => localStorage.getItem('slabfy_signing_up') === 'true',
  
  // Email (temporary)
  setSignupEmail: (email: string) => 
    localStorage.setItem('slabfy_signup_email', email),
  getSignupEmail: () => localStorage.getItem('slabfy_signup_email'),
  
  // Clear all auth storage
  clearAll: () => {
    localStorage.removeItem('slabfy_invite_code');
    localStorage.removeItem('slabfy_signing_up');
    localStorage.removeItem('slabfy_signup_email');
    sessionStorage.removeItem('slabfy_invite_code');
    sessionStorage.removeItem('slabfy_invite_validated');
  }
}
```

---

## 🔧 Implementation Plan

### Phase 1: Setup & Structure (Day 1)
- [ ] Create `features/auth/` folder structure
- [ ] Create `pages/auth/` folder
- [ ] Create `authStorage` utility
- [ ] Create `auth-errors.ts` constants
- [ ] Create `config.ts` with rate limit settings

### Phase 2: Core Components (Day 1-2)
- [ ] `sign-in-form.tsx` - clean, simple sign-in
- [ ] `invite-code-form.tsx` - invite validation
- [ ] `sign-up-form.tsx` - user registration
- [ ] `password-reset-form.tsx` - reset flow
- [ ] Shared `auth-form-layout.tsx` wrapper

### Phase 3: Pages & Routing (Day 2)
- [ ] `/auth/sign-in` page
- [ ] `/auth/sign-up` page (with invite gate)
- [ ] `/auth/check-email` page
- [ ] `/auth/email-confirmed` page
- [ ] `/auth/reset-password` page
- [ ] Update routing in app

### Phase 4: Backend Polish (Day 2-3)
- [ ] Review `/api/auth/sync` endpoint
- [ ] Review `/api/invite-codes/validate`
- [ ] Review `/api/invite-codes/use`
- [ ] Add better logging
- [ ] Add better error responses
- [ ] Test race conditions

### Phase 5: Testing (Day 3)
- [ ] Generate test invite codes in DB
- [ ] Test full signup flow
- [ ] Test rate limiting
- [ ] Test email confirmation
- [ ] Test error states
- [ ] Test concurrent usage (race conditions)

### Phase 6: Migration & Cleanup (Day 3)
- [ ] Migrate old `/pages/sign-in.tsx` → `/pages/auth/sign-in.tsx`
- [ ] Update all internal links
- [ ] Remove old invite-system files
- [ ] Update docs
- [ ] Update README

---

## 🧪 Testing Checklist

### Generate Test Invite Codes
```sql
-- Run this in your DB to create test codes
INSERT INTO invite_codes (id, code, max_uses, is_active, note)
VALUES 
  (gen_random_uuid(), 'SLABFY01', 1, true, 'Test - single use'),
  (gen_random_uuid(), 'SLABFY02', 5, true, 'Test - multi use'),
  (gen_random_uuid(), 'SLABFY03', 1, false, 'Test - inactive'),
  (gen_random_uuid(), 'EXPIRED1', 1, true, 'Test - expired')
  -- Note: Set expires_at manually for EXPIRED1
;
```

### Test Scenarios
1. ✅ Valid invite code → signup → email confirm → dashboard
2. ✅ Invalid invite code → error message
3. ✅ Expired invite code → error message
4. ✅ Used invite code → error message
5. ✅ Rate limiting → 10 attempts → cooldown
6. ✅ Existing email → redirect to sign-in
7. ✅ Weak password → inline error
8. ✅ Email not confirmed → resend flow
9. ✅ Password reset flow
10. ✅ Google OAuth → invite gate (if new user)

---

## 🚀 Production Considerations

### Environment Variables
```bash
# Already set up (verify these exist)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
RESEND_API_KEY=your-resend-key
```

### Email Templates (Resend)
- Confirmation email (Supabase template)
- Password reset email (Supabase template)
- Welcome email (optional)

### Monitoring
- Log all invite code validations
- Log rate limit triggers
- Log user sync successes/failures
- Alert on repeated sync failures

---

## 📝 Following Slabfy Rules

### ✅ Checklist
- [x] **Feature isolation** - All auth in `features/auth/`
- [x] **Max 200 lines per file** - Split into small components
- [x] **AI-first docs** - Each file has `🤖 INTERNAL NOTE`
- [x] **Named exports only** - No default exports
- [x] **Design tokens** - Use CSS custom properties
- [x] **Explicit types** - No `any` types
- [x] **Error handling** - Centralized error messages
- [x] **Single responsibility** - Each component/hook does one thing
- [x] **Self-contained** - Auth feature doesn't import from other features

### Code Style
```tsx
// ✅ Good - Clean, typed, small
export function SignInForm() {
  const { signIn } = useAuth();
  const form = useAuthForm(signInSchema);
  
  const onSubmit = async (data: SignInData) => {
    await signIn(data.email, data.password);
  };
  
  return <Form {...form} onSubmit={onSubmit} />;
}

// ❌ Bad - Too much logic, no types
export default function SignIn() {
  // 300 lines of mixed concerns...
}
```

---

## 🎯 Success Metrics

### Before Rebuild
- ❌ Scattered auth logic across 8+ files
- ❌ Inconsistent error handling
- ❌ Race conditions in user sync
- ❌ Confusing localStorage/sessionStorage usage
- ❌ No rate limiting in dev

### After Rebuild
- ✅ All auth logic in 1 feature folder
- ✅ Consistent error messages
- ✅ No race conditions (atomic DB updates)
- ✅ Clean storage utility
- ✅ Rate limiting works everywhere
- ✅ 100% test coverage on critical paths

---

## 🤔 Questions & Decisions

### Keep or Remove?
- **Current invite-system folder** → Migrate to `invite-system-v2`, keep UI
- **Old auth pages** → Move to `pages/auth/`, simplify logic
- **auth-provider.tsx** → Keep but simplify, remove complex session checks
- **Google OAuth** → Keep, add invite gate for new users

### Open Questions
1. **Do we want social sign-in (Google) to also require invite codes?**
   - Answer: Yes, new users need codes. Existing users bypass.

2. **Should rate limiting be per-IP or per-IP+UserAgent?**
   - Answer: Per-IP for simplicity (good enough for demo phase)

3. **Do we expire unused invite codes automatically?**
   - Answer: Manual expiration for now, automatic later

4. **Should we log all failed invite attempts for security monitoring?**
   - Answer: Yes, log to console (add monitoring service later)

---

## 📚 Next Steps After This Plan

1. **Review this plan together** - make sure we're aligned
2. **Generate test invite codes** - so we can test immediately  
3. **Start Phase 1** - create folder structure
4. **Build incrementally** - one component at a time
5. **Test each component** - before moving to next
6. **Deploy to staging** - test full flow in real env
7. **Go live** - with confidence 🚀

---

## 💬 Final Thoughts

This rebuild focuses on:
- **Simplicity** - Clear, linear flow
- **Security** - Rate limiting, atomic updates, server validation
- **UX** - Consistent, professional, helpful errors
- **Maintainability** - Small files, clear structure, well-documented

We're keeping what works (UI, Supabase, onboarding) and rebuilding what's broken (auth flow, invite system, error handling).

**Goal:** Rock-solid auth system that scales from 3 customers to 300,000. Let's build it right. 💪
