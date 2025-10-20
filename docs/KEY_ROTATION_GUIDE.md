# 🚨 URGENT: Key Rotation Guide

## ✅ What's Been Fixed
1. **RLS Migration Applied** - Row Level Security is now active on all tables
2. **Data Isolation Verified** - Users can no longer see each other's collections
3. **Database-level Security** - All data access is now protected at the database level

## 🔐 Keys That Need Immediate Rotation

### 1. Neon Database (DATABASE_URL)
**Current Status**: Exposed in environment
**Action Required**:
1. Go to Neon Dashboard → Your Project → Settings
2. Reset the password for your database role
3. Copy the new connection string
4. Update in Replit Secrets

### 2. Supabase Keys  
**Keys to Rotate**:
- SUPABASE_SERVICE_KEY (Critical - full admin access!)
- SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY
- SUPABASE_URL (keep the same, but regenerate keys)

**Action Required**:
1. Go to Supabase Dashboard → Project Settings → API
2. Click "Regenerate anon key" 
3. Click "Regenerate service_role key"
4. Update both in Replit Secrets
5. Update VITE_SUPABASE_ANON_KEY with the new anon key

### 3. API Keys
**Keys to Rotate**:
- PSA_API_TOKEN
- GROQ_API_KEY  
- PRICING_API_KEY
- SESSION_SECRET

**Action Required**:
1. PSA API: Go to PSA developer portal and regenerate token
2. GROQ: Go to console.groq.com and create new API key
3. PRICING_API_KEY: Regenerate from your pricing service provider
4. SESSION_SECRET: Generate new one with: `openssl rand -base64 64`

## 📝 Step-by-Step Rotation Process

### Step 1: Rotate Database URL (MOST CRITICAL)
```bash
# In Neon Dashboard:
# 1. Go to Settings → Roles
# 2. Reset password for neondb_owner
# 3. Copy new connection string
# 4. Update in Replit Secrets
```

### Step 2: Rotate Supabase Keys
```bash
# In Supabase Dashboard:
# 1. Project Settings → API
# 2. Regenerate both anon and service_role keys
# 3. Update all 4 Supabase secrets in Replit
```

### Step 3: Generate New Session Secret
```bash
# Run this command to generate a new session secret:
openssl rand -base64 64
# Copy the output and update SESSION_SECRET in Replit Secrets
```

### Step 4: Rotate External API Keys
- PSA_API_TOKEN: Get new token from PSA developer portal
- GROQ_API_KEY: Create new key at console.groq.com
- PRICING_API_KEY: Get from your provider

## ⚠️ Important Notes

1. **Rotate keys in this order** - Database first, then Supabase, then others
2. **Test after each rotation** - Ensure the app still works
3. **Don't commit new keys** - Only store them in Replit Secrets
4. **Monitor for issues** - Watch logs for authentication errors

## 🔒 Security Status

### ✅ Fixed Issues:
- Row Level Security applied to all tables
- Users isolated at database level
- Data leak vulnerability closed

### ⏳ Pending Actions:
- [ ] Rotate DATABASE_URL in Neon
- [ ] Rotate Supabase keys
- [ ] Generate new SESSION_SECRET
- [ ] Rotate API keys (PSA, GROQ, Pricing)
- [ ] Verify app functionality after rotation

## 🚀 After Rotation

Once all keys are rotated:
1. Restart the application
2. Test user login/signup
3. Verify collections are still isolated
4. Check that all API integrations work

## 📊 Testing Commands

Test that RLS is still working after key rotation:
```bash
# Run this to verify isolation
./test-rls-direct.sh
```

---

**Time Required**: ~15-20 minutes
**Priority**: CRITICAL - Do this immediately before going live with 10K users
**Impact**: Prevents unauthorized data access and secures your application