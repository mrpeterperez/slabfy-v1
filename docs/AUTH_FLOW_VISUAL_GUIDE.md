# 🔐 Auth Flow - Visual Guide

This is a simplified visual representation of the new auth flow. See [AUTH_SYSTEM_REBUILD_V2.md](./AUTH_SYSTEM_REBUILD_V2.md) for technical details.

---

## 📍 User Journey Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AUTH FLOW OVERVIEW                          │
└─────────────────────────────────────────────────────────────────────┘

    START HERE
        │
        ▼
┌───────────────┐
│  /auth/sign-in │  ◄──── Default landing page
└───────┬───────┘
        │
        ├─► Already have account? → Enter email/password → Dashboard ✅
        │
        └─► Don't have account? → Click "Create one"
                │
                ▼
        ┌───────────────┐
        │ /auth/sign-up │
        │ (Invite Gate) │
        └───────┬───────┘
                │
                ▼
        Enter invite code (e.g., SLABFY01)
                │
                ├─► Invalid code? → Error message → Try again
                │
                └─► Valid code? → Show signup form
                        │
                        ▼
                Enter email + password
                        │
                        ▼
                ┌─────────────────┐
                │ /auth/check-email│
                └────────┬─────────┘
                        │
                        ▼
                User checks email inbox
                        │
                        ▼
                Clicks confirmation link in email
                        │
                        ▼
                ┌───────────────────────┐
                │ /auth/email-confirmed │
                └───────────┬───────────┘
                        │
                        ├─► Sync user to DB
                        ├─► Mark invite code as used
                        └─► Clear temp storage
                                │
                                ▼
                        ┌─────────────────┐
                        │ /onboarding/step1│
                        └────────┬─────────┘
                                │
                                ├─► Step 1: Username
                                ├─► Step 2: Collections
                                └─► Step 3: Complete
                                        │
                                        ▼
                                ┌──────────────┐
                                │  /dashboard  │ ✅
                                └──────────────┘
```

---

## 🎯 Component Breakdown

### Page: `/auth/sign-in`
```
┌──────────────────────────────────┐
│                                  │
│        🎯 SLABFY LOGO           │
│                                  │
│     Sign in to your account      │
│                                  │
├──────────────────────────────────┤
│                                  │
│  [Continue with Google Button]   │
│                                  │
│         ───── or ─────          │
│                                  │
│  Email:    [________________]    │
│                                  │
│  Password: [________________]    │
│            Forgot password? →    │
│                                  │
│  [      Sign In Button      ]    │
│                                  │
│  Don't have an account?          │
│  Create one →                    │
│                                  │
└──────────────────────────────────┘
```

### Page: `/auth/sign-up` (Before Code Validation)
```
┌──────────────────────────────────┐
│                                  │
│        🎯 SLABFY LOGO           │
│                                  │
│       Welcome to Slabfy          │
│   Enter your invite code         │
│                                  │
├──────────────────────────────────┤
│                                  │
│  Invite Code:                    │
│  [________] (8 characters)       │
│                                  │
│  [     Continue Button      ]    │
│                                  │
│  Don't have a code?              │
│  Request access →                │
│                                  │
└──────────────────────────────────┘
```

### Page: `/auth/sign-up` (After Code Validation)
```
┌──────────────────────────────────┐
│                                  │
│        🎯 SLABFY LOGO           │
│                                  │
│   Create your Slabfy account     │
│                                  │
├──────────────────────────────────┤
│                                  │
│  [Continue with Google Button]   │
│                                  │
│         ───── or ─────          │
│                                  │
│  Email:    [________________]    │
│                                  │
│  Password: [________________]    │
│            (min 6 characters)    │
│                                  │
│  [    Create Account Button ]    │
│                                  │
│  Already have an account?        │
│  Sign in →                       │
│                                  │
└──────────────────────────────────┘
```

### Page: `/auth/check-email`
```
┌──────────────────────────────────┐
│                                  │
│        🎯 SLABFY LOGO           │
│                                  │
│          📧 Mail Icon            │
│                                  │
│      Check Your Email            │
│                                  │
│  We sent a confirmation link to  │
│      user@example.com           │
│                                  │
│  Click the link to activate      │
│       your account               │
│                                  │
├──────────────────────────────────┤
│                                  │
│  [Resend Confirmation Email]     │
│  (60s cooldown)                  │
│                                  │
│  [   Back to Sign In   ]         │
│                                  │
│  [   Try Different Email   ]     │
│                                  │
└──────────────────────────────────┘
```

### Page: `/auth/email-confirmed`
```
┌──────────────────────────────────┐
│                                  │
│        🎯 SLABFY LOGO           │
│                                  │
│          ✅ Check Icon           │
│                                  │
│      Email Confirmed!            │
│                                  │
│  Your email has been             │
│  successfully confirmed.         │
│  Welcome to Slabfy!              │
│                                  │
├──────────────────────────────────┤
│                                  │
│  [  Continue to Dashboard  ]     │
│                                  │
└──────────────────────────────────┘
```

---

## 🔄 State Flow

### LocalStorage / SessionStorage Usage

```
USER ACTION                 STORAGE OPERATION
───────────                ─────────────────

Enter valid invite code → localStorage.setItem('slabfy_invite_code', 'SLABFY01')
                        → sessionStorage.setItem('slabfy_invite_validated', 'true')

Submit signup form      → localStorage.setItem('slabfy_signing_up', 'true')
                        → localStorage.setItem('slabfy_signup_email', 'user@example.com')

Click email confirm     → Read 'slabfy_invite_code' from localStorage
                        → POST /api/auth/sync with invite code
                        → localStorage.removeItem('slabfy_invite_code')
                        → localStorage.removeItem('slabfy_signing_up')
                        → localStorage.removeItem('slabfy_signup_email')
                        → sessionStorage.removeItem('slabfy_invite_validated')

Complete onboarding     → Normal app flow
```

---

## 🛡️ Security Checkpoints

```
┌────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                         │
└────────────────────────────────────────────────────────────┘

1. INVITE CODE VALIDATION
   │
   ├─► Server checks: exists, active, not expired, not exhausted
   ├─► Rate limiting: 10 attempts per 15 minutes per IP
   └─► Returns only: { isValid: true/false }

2. EMAIL/PASSWORD SIGNUP
   │
   ├─► Supabase handles: password hashing, email uniqueness
   ├─► Password requirements: min 6 characters
   └─► Sends confirmation email

3. EMAIL CONFIRMATION
   │
   ├─► Supabase magic link validates email ownership
   └─► Prevents account creation without email access

4. USER SYNC TO DATABASE
   │
   ├─► Checks invite code AGAIN (server-side)
   ├─► Atomic DB transaction: create user + mark code used
   ├─► Prevents race conditions
   └─► Validates uniqueness

5. ONBOARDING
   │
   ├─► User must complete profile setup
   └─► Redirects to dashboard when done
```

---

## ⚠️ Error Handling Flow

```
ERROR SCENARIO                         USER EXPERIENCE
─────────────                         ───────────────

Invalid invite code                → ❌ Toast: "Invalid invite code"
                                  → Clear input, allow retry

Expired invite code                → ❌ Toast: "This code has expired"
                                  → Show "Request new code" link

Code used up (exhausted)           → ❌ Toast: "This code has been used"
                                  → Show "Request new code" link

Rate limit exceeded                → ❌ Toast: "Too many attempts"
                                  → Show countdown timer (15 min)

Email already exists               → ⚠️ Toast: "Account exists, please sign in"
                                  → Auto-redirect to sign-in page

Weak password                      → ⚠️ Inline error under password field
                                  → Allow immediate retry

Email confirmation timeout         → ℹ️ Show resend button on check-email
                                  → Allow resend with cooldown

Network error                      → 🔄 Toast: "Connection error"
                                  → Show retry button

Database error                     → ❌ Toast: "Something went wrong"
                                  → Log error, show support contact
```

---

## 📱 Mobile Considerations

```
DESKTOP VIEW (768px+)              MOBILE VIEW (<768px)
─────────────────────             ─────────────────

Form width: 480px                 Form width: 90vw
Font size: 16px                   Font size: 16px (prevent zoom)
Button height: 40px               Button height: 44px (touch target)
Input padding: 12px               Input padding: 16px
Logo size: 48px                   Logo size: 40px
```

---

## 🎨 UI States

### Button States
```
DEFAULT       → bg-primary text-primary-foreground
HOVER         → bg-primary/90
DISABLED      → bg-muted text-muted-foreground cursor-not-allowed
LOADING       → spinner + "Loading..." text, disabled
SUCCESS       → (transition to next page, no explicit state)
```

### Input States
```
DEFAULT       → border-input
FOCUS         → border-ring ring-ring
ERROR         → border-destructive (red)
DISABLED      → bg-muted cursor-not-allowed
```

### Form Validation
```
PRISTINE      → No validation shown
TOUCHED       → Show errors after blur
SUBMITTING    → All inputs disabled, button loading
SUBMITTED     → Clear form, show success message or error
```

---

## 🧪 Test Scenarios Map

```
TEST                              EXPECTED RESULT
────                              ───────────────

1. Valid code SLABFY01          → ✅ Show signup form
2. Invalid code WRONGXXX         → ❌ Error toast
3. Expired code EXPIRED1         → ❌ Error toast
4. Used code (current_uses >= max) → ❌ Error toast
5. Inactive code SLABFY03        → ❌ Error toast
6. 10 invalid attempts           → ⏱️ 15min cooldown
7. Existing email signup         → ⚠️ Redirect to sign-in
8. Weak password (<6 chars)      → ⚠️ Inline error
9. Email not confirmed signin    → ℹ️ Show resend banner
10. Reset password flow          → ✅ Receive email, reset works
11. Google OAuth new user        → 🔒 Show invite gate
12. Google OAuth existing user   → ✅ Bypass gate, go to dashboard
13. Refresh during invite gate   → ℹ️ Must re-enter code
14. Refresh after email confirm  → ✅ Auto-redirect to dashboard
15. Multiple tabs same account   → ✅ Sync across tabs
```

---

## 🚀 Production Checklist

```
CATEGORY              CHECKLIST ITEM                          STATUS
────────             ──────────────                          ──────

Supabase Setup       ✓ Project created                       [ ]
                     ✓ Email templates configured            [ ]
                     ✓ Auth settings verified                [ ]
                     ✓ RLS policies enabled                  [ ]

Resend Setup         ✓ API key added to env                  [ ]
                     ✓ Domain verified                       [ ]
                     ✓ Email sending tested                  [ ]

Database             ✓ invite_codes table created            [ ]
                     ✓ Test codes generated                  [ ]
                     ✓ Production codes ready                [ ]

Frontend             ✓ All pages created                     [ ]
                     ✓ All components tested                 [ ]
                     ✓ Mobile responsive                     [ ]
                     ✓ Accessibility checked                 [ ]

Backend              ✓ API endpoints working                 [ ]
                     ✓ Rate limiting enabled                 [ ]
                     ✓ Error logging configured              [ ]
                     ✓ Security headers set                  [ ]

Testing              ✓ All flows tested                      [ ]
                     ✓ Error states verified                 [ ]
                     ✓ Edge cases handled                    [ ]
                     ✓ Load testing done                     [ ]

Documentation        ✓ User guide written                    [ ]
                     ✓ API docs updated                      [ ]
                     ✓ Troubleshooting guide                 [ ]
                     ✓ Code comments complete                [ ]
```

---

## 🎯 Quick Reference: API Endpoints

```
METHOD  ENDPOINT                      PURPOSE
──────  ────────                      ───────

POST    /api/invite-codes/validate   Validate invite code (public)
POST    /api/invite-codes/use        Mark code as used (internal)
POST    /api/auth/sync               Sync Supabase user to DB
POST    /api/auth/register           Create user account (legacy)

Supabase Auth (client-side)
- signUp(email, password)            Create Supabase user
- signIn(email, password)            Sign in existing user
- signInWithGoogle()                 OAuth sign-in
- resetPassword(email)               Send reset email
- updateUser({ password })           Update password
```

---

**📌 Remember:** This is the "what" and "how" - see the full plan for the "why" and technical implementation details!

**Status:** Ready to build 🚀
**Last Updated:** 2025-01-21
