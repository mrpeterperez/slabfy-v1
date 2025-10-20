# Security Checklist for Production Deployment

## API Documentation Security ✅ FIXED
- **Issue**: API docs were exposed without authentication at `/api-docs`
- **Fix Applied**: Added `authenticateSwaggerUI` middleware to secure access
- **Result**: HTTP 401 response for unauthorized access
- **Production Key**: `SWAGGER_DOCS_KEY` environment variable required

## Production Server Configuration ✅ SECURED
- **Removed**: Production server URL from Swagger configuration
- **Current**: Only development server URL shown in API docs
- **Security**: Prevents production API endpoints from being exposed in documentation

## Authentication Status ✅ SECURE
- **Bearer Token**: JWT authentication via Supabase implemented
- **Rate Limiting**: Auth endpoints protected with strict rate limits
- **CORS**: Production domains whitelist configured
- **Helmet**: Security headers properly configured

## Environment Variables Required for Production
```bash
SWAGGER_DOCS_KEY=your_secure_api_docs_password
SUPABASE_URL=your_production_supabase_url
SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
```
- [ ] Rotate any secrets that were ever committed to git:
	- [ ] Supabase Service Key (create new, revoke old)
	- [ ] Supabase anon key (regenerate)
	- [ ] Database URL / password (rotate in Neon or provider)
	- [ ] External API keys (GROQ_API_KEY, PRICING_API_KEY)
- [ ] Remove committed secrets from history using BFG or git filter-repo
- [ ] Ensure `.env` files are ignored and use `.env.example` for templates
- [ ] Enable CI secret scanning (Gitleaks) and local pre-commit hooks (Husky)

### CORS policy

- [ ] Server Express: centralized allowlist for production origins only
- [ ] Supabase Edge Functions: reflect allowed origins using `CORS_ORIGINS` env var
- [ ] No wildcard `*` for credentialed requests

### Auth and RLS

- [ ] All user-scoped routes derive `userId` from a verified JWT (no hardcoded IDs)
- [ ] Verify Supabase RLS policies are applied and enforced for all tables
- [ ] Run verification queries (see `supabase/rls_policies.sql`)

## Security Testing Commands
```bash
# Test API docs are secured
curl -I https://slabfy.com/api-docs/
# Should return HTTP 401

# Test with authentication
curl -H "Authorization: Bearer YOUR_SWAGGER_KEY" https://slabfy.com/api-docs/
# Should return HTTP 200 with docs
```

## Verified Security Measures ✅
- [x] API documentation requires authentication
- [x] Production server URLs removed from public docs
- [x] Rate limiting applied to auth endpoints
- [x] CORS configured for production domains only
- [x] Helmet security headers enabled
- [x] Environment variable validation on startup
- [x] Invite-only registration system active

## Next Steps for Production
1. Ensure all production environment variables are set
2. Test API docs security on production domain
3. Verify rate limiting is working
4. Monitor authentication logs