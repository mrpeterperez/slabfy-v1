# 🔐 Auth System Rebuild - Implementation Checklist

Quick reference for implementing the auth system rebuild. See [AUTH_SYSTEM_REBUILD_V2.md](./AUTH_SYSTEM_REBUILD_V2.md) for full details.

---

## 🎯 Phase 1: Setup & Structure

### Create Folders
- [ ] `client/src/features/auth/`
- [ ] `client/src/features/auth/components/`
- [ ] `client/src/features/auth/hooks/`
- [ ] `client/src/features/auth/utils/`
- [ ] `client/src/pages/auth/`

### Create Utility Files
- [ ] `features/auth/utils/auth-storage.ts` - localStorage/sessionStorage wrapper
- [ ] `features/auth/utils/auth-errors.ts` - Error messages constants
- [ ] `features/auth/config.ts` - Rate limits, timeouts, etc.
- [ ] `features/auth/types.ts` - TypeScript types
- [ ] `features/auth/README.md` - Feature documentation
- [ ] `features/auth/index.ts` - Public exports

---

## 🎨 Phase 2: Core Components

### Auth Form Components
- [ ] `components/auth-form-layout.tsx` - Shared layout wrapper
- [ ] `components/sign-in-form.tsx` - Email/password sign-in
- [ ] `components/invite-code-form.tsx` - Invite validation
- [ ] `components/sign-up-form.tsx` - User registration
- [ ] `components/password-reset-form.tsx` - Reset password
- [ ] `components/email-confirmation-banner.tsx` - Resend email UI

### Custom Hooks
- [ ] `hooks/use-auth-form.ts` - Shared form logic
- [ ] `hooks/use-invite-validation.ts` - Invite code validation
- [ ] `hooks/use-rate-limit.ts` - Client-side rate limit tracking

---

## 📄 Phase 3: Pages & Routing

### Create Pages
- [ ] `pages/auth/sign-in.tsx` - `/auth/sign-in`
- [ ] `pages/auth/sign-up.tsx` - `/auth/sign-up` (includes invite gate)
- [ ] `pages/auth/check-email.tsx` - `/auth/check-email`
- [ ] `pages/auth/email-confirmed.tsx` - `/auth/email-confirmed`
- [ ] `pages/auth/reset-password.tsx` - `/auth/reset-password`

### Update Routing
- [ ] Update app routing config to use `/auth/*` routes
- [ ] Add redirects from old routes to new routes
- [ ] Update all internal links (sign-in, sign-up, etc.)

---

## 🔧 Phase 4: Backend Polish

### API Endpoints (Review & Improve)
- [ ] Review `server/routes/auth/index.ts` - `/api/auth/sync`
- [ ] Review `server/routes/invite-codes.ts` - validate/use endpoints
- [ ] Add better error logging
- [ ] Add structured error responses
- [ ] Test atomic operations for race conditions

### Rate Limiting
- [ ] Update rate limit to work in dev mode
- [ ] Add better rate limit tracking (IP-based)
- [ ] Add cooldown timer response
- [ ] Log rate limit violations

---

## 🧪 Phase 5: Testing

### Generate Test Data
- [ ] Run `tsx scripts/generate-test-invite-codes.ts`
- [ ] Verify codes in database
- [ ] Test each code manually

### Test Flows
- [ ] Valid code → signup → email confirm → dashboard
- [ ] Invalid code → error message
- [ ] Expired code → error message
- [ ] Used code (exhausted) → error message
- [ ] Rate limiting → 10 attempts → cooldown message
- [ ] Existing email → redirect to sign-in
- [ ] Weak password → inline error
- [ ] Email not confirmed → resend email flow
- [ ] Password reset → receive email → set new password
- [ ] Google OAuth → new user → invite gate

### Edge Cases
- [ ] Multiple tabs (localStorage sync)
- [ ] Browser back button during signup
- [ ] Refresh page during invite validation
- [ ] Network timeout during submit
- [ ] Concurrent code usage (race condition)

---

## 🚀 Phase 6: Migration & Cleanup

### Move Old Files
- [ ] Move `/pages/sign-in.tsx` → `/pages/auth/sign-in.tsx`
- [ ] Move `/pages/sign-up.tsx` → `/pages/auth/sign-up.tsx`
- [ ] Move `/pages/reset-password.tsx` → `/pages/auth/reset-password.tsx`
- [ ] Move `/pages/check-email.tsx` → `/pages/auth/check-email.tsx`
- [ ] Move `/pages/email-confirmed.tsx` → `/pages/auth/email-confirmed.tsx`

### Clean Up Old Code
- [ ] Archive old `features/invite-system/` to `features/invite-system-v1/`
- [ ] Update imports across the codebase
- [ ] Remove unused components
- [ ] Remove debugging console.logs
- [ ] Update documentation

### Final Polish
- [ ] Run linter/formatter
- [ ] Check for TypeScript errors
- [ ] Verify all routes work
- [ ] Test on mobile viewport
- [ ] Check accessibility (keyboard navigation, screen readers)

---

## 📝 Documentation Updates

- [ ] Update main README.md with new auth flow
- [ ] Update API documentation
- [ ] Add troubleshooting guide
- [ ] Document environment variables
- [ ] Create user-facing "How to sign up" guide

---

## ✅ Pre-Launch Checklist

### Security
- [ ] All secrets in `.env.local` (not committed)
- [ ] Rate limiting enabled
- [ ] Invite code validation server-side only
- [ ] User input sanitized
- [ ] CSRF protection enabled
- [ ] Session security configured

### Performance
- [ ] Lazy load auth pages
- [ ] Optimize bundle size
- [ ] Add loading skeletons
- [ ] Test on slow network

### UX
- [ ] All error messages user-friendly
- [ ] Success states clearly communicated
- [ ] Loading states on all buttons
- [ ] Form validation immediate feedback
- [ ] Mobile responsive
- [ ] Dark mode working

### Production
- [ ] Supabase email templates configured
- [ ] Resend API key set up
- [ ] Email sending working
- [ ] Error monitoring configured
- [ ] Analytics tracking added

---

## 🎯 Quick Start Commands

```bash
# Install dependencies
npm install

# Generate test invite codes
tsx scripts/generate-test-invite-codes.ts

# Run dev server
npm run dev

# Check TypeScript errors
npx tsc --noEmit

# Run linter
npm run lint

# Format code
npm run format
```

---

## 📊 Success Criteria

- ✅ User can sign up with valid invite code
- ✅ User can sign in with email/password
- ✅ User can reset password
- ✅ Email confirmation flow works
- ✅ Google OAuth works (with invite gate)
- ✅ Rate limiting prevents abuse
- ✅ All error states handled gracefully
- ✅ Mobile-friendly UI
- ✅ No console errors
- ✅ TypeScript errors resolved
- ✅ All tests passing
- ✅ Documentation complete

---

## 🆘 Troubleshooting

### Common Issues

**Issue:** Invite code validation fails
- Check database connection
- Verify code exists in `invite_codes` table
- Check code is active and not expired

**Issue:** Email confirmation not working
- Check Supabase email settings
- Verify Resend API key
- Check spam folder
- Try resending confirmation

**Issue:** Rate limiting not working
- Check server-side tracking
- Verify IP address detection
- Clear rate limit cache

**Issue:** User sync fails
- Check `/api/auth/sync` endpoint
- Verify invite code in localStorage
- Check database constraints

---

## 📞 Need Help?

- Review full plan: [AUTH_SYSTEM_REBUILD_V2.md](./AUTH_SYSTEM_REBUILD_V2.md)
- Check Slabfy rules: [../slabfyrules.md](../slabfyrules.md)
- Check Supabase docs
- Check Resend docs

---

**Last Updated:** 2025-01-21
**Status:** Ready to implement ✅
