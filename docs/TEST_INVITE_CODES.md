# 🎟️ Test Invite Codes - Generated

**Generated:** October 21, 2025  
**Database:** Supabase (koeoplnomfmuzreldryz)  
**Status:** ✅ Ready to test

---

## 📋 Available Test Codes

### ✅ Valid Codes (Use These for Testing)

#### 1. **SLABFY01** - Single Use
- **Max Uses:** 1
- **Current Uses:** 0
- **Status:** Active ✅
- **Expires:** 2025-10-29 (7 days)
- **Purpose:** Test single-use invite code flow
- **Test:** Complete signup flow, verify code can only be used once

#### 2. **SLABFY02** - Multi-Use
- **Max Uses:** 5
- **Current Uses:** 0
- **Status:** Active ✅
- **Expires:** 2025-11-21 (30 days)
- **Purpose:** Test multi-use code (can create 5 accounts)
- **Test:** Create multiple accounts, verify counter increments

#### 3. **DEMO2025** - High Capacity
- **Max Uses:** 10
- **Current Uses:** 0
- **Status:** Active ✅
- **Expires:** 2026-01-20 (90 days)
- **Purpose:** Long-term demo code for testing
- **Test:** Use for multiple demo accounts, load testing

---

### ❌ Invalid Codes (Test Error Handling)

#### 4. **SLABFY03** - Inactive
- **Max Uses:** 1
- **Current Uses:** 0
- **Status:** Inactive ❌
- **Expires:** 2025-10-29
- **Purpose:** Test inactive code rejection
- **Expected Error:** "This invite code has been deactivated"

#### 5. **EXPIRED1** - Expired
- **Max Uses:** 1
- **Current Uses:** 0
- **Status:** Active but EXPIRED ⏱️
- **Expires:** 2025-10-21 (yesterday)
- **Purpose:** Test expired code rejection
- **Expected Error:** "This invite code has expired"

---

## 🧪 Test Scenarios

### Scenario 1: Valid Single-Use Code ✅
```
1. Go to /auth/sign-up
2. Enter code: SLABFY01
3. Expected: Code validates, shows signup form
4. Complete signup with email: test1@example.com
5. Verify email and complete onboarding
6. Try using SLABFY01 again
7. Expected: "This invite code has reached its usage limit"
```

### Scenario 2: Multi-Use Code ✅
```
1. Use SLABFY02 for account 1
2. Use SLABFY02 for account 2
3. Use SLABFY02 for account 3
4. All should work (0/5 → 1/5 → 2/5 → 3/5)
5. After 5th use, code should be exhausted
```

### Scenario 3: Inactive Code ❌
```
1. Enter code: SLABFY03
2. Expected: Error toast "This invite code has been deactivated"
3. Code input clears, user can try again
```

### Scenario 4: Expired Code ⏱️
```
1. Enter code: EXPIRED1
2. Expected: Error toast "This invite code has expired"
3. Suggest user request new code
```

### Scenario 5: Invalid Code ❌
```
1. Enter code: WRONGCODE
2. Expected: Error toast "Invalid invite code"
3. Code input clears, user can try again
```

### Scenario 6: Rate Limiting 🚫
```
1. Enter 10 invalid codes in a row
2. Expected: After 10 attempts, rate limit kicks in
3. Error: "Too many attempts. Please try again in 15 minutes"
4. Show countdown timer
5. Wait 15 minutes or test with different IP
```

---

## 📊 Code Usage Tracking

Check code usage at any time:
```sql
SELECT 
  code,
  max_uses,
  current_uses,
  CONCAT(current_uses, '/', max_uses) as usage,
  is_active,
  expires_at,
  note
FROM invite_codes
ORDER BY created_at DESC;
```

---

## 🔄 Reset a Code

If you need to reset a code's usage:
```sql
UPDATE invite_codes 
SET current_uses = 0, used_at = NULL, used_by = NULL
WHERE code = 'SLABFY01';
```

---

## ➕ Generate More Codes

Need more test codes? Run:
```bash
npx tsx scripts/generate-test-invite-codes.ts
```

Or manually insert:
```sql
INSERT INTO invite_codes (id, code, max_uses, current_uses, is_active, note, expires_at)
VALUES (
  gen_random_uuid()::text,
  'YOURCODE',
  1,
  0,
  true,
  'Your note here',
  NOW() + INTERVAL '7 days'
);
```

---

## 🚀 Quick Test Commands

### Test Validation Endpoint
```bash
curl -X POST http://localhost:5000/api/invite-codes/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"SLABFY01"}'
```

Expected response:
```json
{
  "isValid": true
}
```

### Test Invalid Code
```bash
curl -X POST http://localhost:5000/api/invite-codes/validate \
  -H "Content-Type: application/json" \
  -d '{"code":"WRONGCODE"}'
```

Expected response:
```json
{
  "isValid": false,
  "error": "Invalid invite code"
}
```

---

## 📝 Testing Checklist

- [ ] Valid code (SLABFY01) - accepts and shows form
- [ ] Invalid code (WRONGCODE) - shows error
- [ ] Inactive code (SLABFY03) - shows "deactivated" error
- [ ] Expired code (EXPIRED1) - shows "expired" error
- [ ] Multi-use code (SLABFY02) - accepts 5 times
- [ ] Exhausted code - shows "usage limit" error
- [ ] Rate limiting - blocks after 10 attempts
- [ ] Code stored in localStorage during signup
- [ ] Code consumed on email confirmation
- [ ] Database updates atomically (no race conditions)

---

## 🔒 Production Codes

When ready for production:

1. **Delete test codes:**
```sql
DELETE FROM invite_codes WHERE note LIKE 'Test -%';
```

2. **Generate production codes:**
```sql
INSERT INTO invite_codes (id, code, max_uses, current_uses, is_active, note, expires_at)
VALUES 
  (gen_random_uuid()::text, 'PROD001', 1, 0, true, 'Customer: John Doe', NOW() + INTERVAL '30 days'),
  (gen_random_uuid()::text, 'PROD002', 1, 0, true, 'Customer: Jane Smith', NOW() + INTERVAL '30 days'),
  (gen_random_uuid()::text, 'PROD003', 1, 0, true, 'Customer: Acme Corp', NOW() + INTERVAL '30 days');
```

3. **Send codes to customers via email**

---

## 🎯 Next Steps

1. ✅ **Test codes generated** - Done!
2. **Start dev server:** `npm run dev`
3. **Test signup flow:** Use SLABFY01
4. **Verify all scenarios:** Follow test checklist above
5. **Fix any bugs:** Iterate on auth rebuild
6. **Deploy:** Ship to production 🚀

---

**Generated with:** Supabase MCP Server  
**Last Updated:** 2025-10-21  
**Status:** ✅ Ready for Testing
