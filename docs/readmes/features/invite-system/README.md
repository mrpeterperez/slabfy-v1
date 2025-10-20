# Invite Code System

## Purpose
Secure invite-only registration system that blocks unauthorized account creation.

## Features
- Server-side invite code validation
- One-time-use invite codes
- Admin management interface
- Rate limiting protection
- Audit logging

## Components
- `InviteCodeForm` - Code entry form for registration
- `AdminInviteManager` - Admin interface for code management
- `useInviteValidation` - Hook for code validation

## Database Schema
- `invite_codes` table with expiration and usage tracking
- Foreign key to user who created the code

## Security Features
- Server-side validation only
- Rate limiting on validation attempts
- Codes expire after set time period
- No client-side bypass possible

## Dependencies
- `@/shared/schema` - Database types
- `@/lib/api` - API utilities
- `@/components/ui` - UI components