# 🔐 SECRET ROTATION CHECKLIST

## 🔴 CRITICAL - Rotate These First

### 1. DATABASE_URL
**Current Secret Name in Replit**: `DATABASE_URL`  
**Where to Get New Value**:
1. Go to [Neon Dashboard](https://console.neon.tech)
2. Select your project
3. Go to Settings → Connection Details
4. Click "Reset Password" for `neondb_owner`
5. Copy the new connection string (starts with `postgresql://`)
**Paste in Replit Secrets**: `DATABASE_URL`

---

### 2. SUPABASE_SERVICE_KEY
**Current Secret Name in Replit**: `SUPABASE_SERVICE_KEY`  
**Where to Get New Value**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Find "service_role" secret
5. Click "Regenerate service_role key"
6. Copy the new JWT token
**Paste in Replit Secrets**: `SUPABASE_SERVICE_KEY`

---

### 3. SUPABASE_ANON_KEY (Update 3 places!)
**Where to Get New Value**:
1. Same Supabase Dashboard → Settings → API
2. Find "anon" public key
3. Click "Regenerate anon key"
4. Copy the new JWT token

**Update ALL THREE in Replit Secrets**:
- `SUPABASE_ANON_KEY` → paste new anon key
- `VITE_SUPABASE_ANON_KEY` → paste same new anon key
- `SUPABASE_KEY` → paste same new anon key

---

## 🟡 IMPORTANT - Rotate These Next

### 4. SESSION_SECRET
**Current Secret Name in Replit**: `SESSION_SECRET`  
**New Value** (use this one I generated):
```
SESiZEkAfWNXYfyD4CUYm2Yf7VbAkUHrVNMyDissvYKz09Wx6GHs3So0TgESoiYe
UJuHaWZ9zK0pp566aAaJlQ==
```
**Paste in Replit Secrets**: `SESSION_SECRET`

---

### 5. PSA_API_TOKEN
**Current Secret Name in Replit**: `PSA_API_TOKEN`  
**Where to Get New Value**:
1. Go to PSA Developer Portal
2. Navigate to API Keys/Tokens
3. Revoke old token
4. Generate new API token
5. Copy the token
**Paste in Replit Secrets**: `PSA_API_TOKEN`

---

### 6. GROQ_API_KEY
**Current Secret Name in Replit**: `GROQ_API_KEY`  
**Where to Get New Value**:
1. Go to [console.groq.com](https://console.groq.com)
2. Navigate to API Keys
3. Delete old key
4. Create new API key
5. Copy immediately (shown only once)
**Paste in Replit Secrets**: `GROQ_API_KEY`

---

### 7. PRICING_API_KEY
**Current Secret Name in Replit**: `PRICING_API_KEY`  
**Where to Get New Value**:
1. Go to your pricing provider dashboard
2. Regenerate API key
3. Copy new key
**Paste in Replit Secrets**: `PRICING_API_KEY`

---

### 8. SWAGGER_DOCS_KEY
**Current Secret Name in Replit**: `SWAGGER_DOCS_KEY`  
**Where to Get New Value**:
Generate a new random key using:
```bash
openssl rand -hex 32
```
**Paste in Replit Secrets**: `SWAGGER_DOCS_KEY`

---

## 🟢 Keep These (Don't Need Rotation)

These are URLs/IDs that don't need rotation:
- `SUPABASE_URL` - This is your project URL, keep it
- `VITE_SUPABASE_URL` - Same URL, keep it
- `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` - OAuth config, keep unless compromised

---

## 📝 Supabase Additional Configuration

After rotating Supabase keys, also check:

1. **In Supabase Dashboard → Authentication → Providers**:
   - Ensure Google OAuth is still configured
   - Check redirect URLs match your app

2. **In Supabase Dashboard → Settings → Database**:
   - Connection pooling should be enabled
   - Connection string should use "Transaction" mode

---

## ✅ Rotation Steps Order

1. ⏸️ **Stop your app** (optional but safer)

2. **Rotate in this order**:
   - [ ] DATABASE_URL
   - [ ] Test database connection works
   - [ ] SUPABASE_SERVICE_KEY
   - [ ] SUPABASE_ANON_KEY (all 3 copies)
   - [ ] Test auth still works
   - [ ] SESSION_SECRET
   - [ ] PSA_API_TOKEN
   - [ ] GROQ_API_KEY
   - [ ] PRICING_API_KEY
   - [ ] SWAGGER_DOCS_KEY

3. **Restart app and verify**:
   - [ ] Can login/signup
   - [ ] Can view collections
   - [ ] Can scan PSA cards
   - [ ] API endpoints work

---

## 🚨 How to Update in Replit

1. Click the 🔒 **Secrets** tab (left sidebar)
2. Find the secret name
3. Click the pencil icon to edit
4. Paste the new value
5. Click Save
6. The app will auto-restart

---

## ⚠️ IMPORTANT NOTES

- **Copy keys exactly** - No extra spaces or newlines
- **Test after each critical key** - Especially DATABASE_URL and Supabase keys
- **Keep a backup** - Store new keys in your password manager
- **Never commit keys** - Only store in Secrets tab
- **Watch logs** - Check for authentication errors after rotation

---

**Time Required**: 15-20 minutes
**Priority**: CRITICAL before going live