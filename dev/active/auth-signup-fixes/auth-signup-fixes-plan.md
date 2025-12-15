# Auth & Signup Fixes Implementation Plan

## Overview
Fix authentication bugs (session persistence, stale sessions) and improve signup UX with in-app registration form, auto-login, and show/hide password toggle.

## Goals
- Fix session not persisting after app restart
- Fix stale session causing auto-redirect on wrong backend
- Add in-app signup form with auto-login after registration
- Add show/hide password toggle for better UX
- Improve error messages for failed login/signup

## Technical Approach

### Phase 1: Quick Fixes
Fix `selectSession()` to always clear stale data when no session found. Add backend validation to signin redirect. Improve error messages.

### Phase 2: UX Improvements
Build in-app signup screen using PeerTube's `/api/v1/users/register` endpoint. Single email field (derive username from email). Single password field with show/hide toggle (no confirm field per 2024/2025 best practices). Auto-login after successful registration.

### Phase 3: Proper Initialization
Load auth state from AsyncStorage BEFORE router renders to eliminate race condition where `clearSession()` runs before backend param is available.

## Files to Create/Modify

**Phase 1:**
- `OwnTube.tv/store/authSessionStore.ts` - Fix selectSession to clear stale sessions
- `OwnTube.tv/app/(home)/signin.tsx` - Add backend validation to redirect
- `OwnTube.tv/screens/SignIn/index.tsx` - Better error message
- `OwnTube.tv/locales/en/translation.json` - Add translation keys

**Phase 2:**
- `OwnTube.tv/screens/SignIn/index.tsx` - Add show/hide password, update signup link
- `OwnTube.tv/api/authApi.ts` - Add register() method
- `OwnTube.tv/screens/SignUp/index.tsx` - NEW: Signup screen
- `OwnTube.tv/app/(home)/signup.tsx` - NEW: Route file
- `OwnTube.tv/types.ts` - Add SIGNUP route constant

**Phase 3:**
- `OwnTube.tv/store/authSessionStore.ts` - Add initialization logic
- `OwnTube.tv/app/_layout.tsx` - Block render until initialized
- `OwnTube.tv/hooks/useAuthSessionSync.tsx` - Simplify (remove clearSession on undefined)

## Dependencies
- PeerTube API: `POST /api/v1/users/register` endpoint
- PeerTube types: `UserRegister` interface from `@peertube/peertube-types`
- Existing auth flow: `authApi.ts`, `authSessionStore.ts`

## Success Criteria
- [ ] Session persists after app close/reopen (cold start)
- [ ] Switching backends clears stale session properly
- [ ] Create account in-app → auto logged in
- [ ] Duplicate email shows "already registered" error
- [ ] Show/hide password toggle works with accessibility
- [ ] No confirm password field (single password input)
- [ ] Force quit from app switcher → still logged in
