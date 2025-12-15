# Auth & Signup Fixes Context

**Last Updated**: 2025-12-14

## Key Files

### Auth Store & Session Management
- `OwnTube.tv/store/authSessionStore.ts` - Zustand store for auth session (has the stale session bug)
- `OwnTube.tv/hooks/useAuthSessionSync.tsx` - Syncs session on backend change (has race condition)
- `OwnTube.tv/utils/storage.ts` - AsyncStorage wrapper (uses Settings API on tvOS)
- `OwnTube.tv/utils/auth.ts` - Parses auth session data from login response

### Auth API
- `OwnTube.tv/api/authApi.ts` - Login API (needs register method added)
- `OwnTube.tv/api/models.ts` - Types including `LoginRequestArgs`, `UserLoginResponse`

### Screens & Routes
- `OwnTube.tv/screens/SignIn/index.tsx` - Current signin screen (322 lines)
- `OwnTube.tv/app/(home)/signin.tsx` - Route file with redirect logic (has backend validation bug)
- `OwnTube.tv/app/_layout.tsx` - Root layout, calls useAuthSessionSync

### Types & Config
- `OwnTube.tv/types.ts` - ROUTES enum, STORAGE keys
- `OwnTube.tv/locales/en/translation.json` - i18n strings

## Architecture Notes

### Session Storage Pattern
- Sessions stored in AsyncStorage at key `${backend}/auth`
- Last used backend stored at `STORAGE.DATASOURCE`
- tvOS uses React Native Settings API instead of AsyncStorage (500KB limit)

### Current Auth Flow
1. User enters credentials on SignIn screen
2. `login()` calls PeerTube OAuth endpoint
3. `addSession()` saves to AsyncStorage
4. `selectSession()` loads into Zustand store
5. `useAuthSessionSync` hook manages session sync on backend changes

### The Race Condition
On app startup:
1. `_layout.tsx` renders, `useAuthSessionSync` runs
2. `backend` param is undefined (router not ready)
3. `clearSession()` runs (clears in-memory session)
4. `index.tsx` reads backend from AsyncStorage, navigates
5. `selectSession(backend)` runs but UI already rendered as logged out

### PeerTube Register API
```typescript
POST /api/v1/users/register
{
  username: string;  // required, 1-50 chars
  password: string;  // required, min 6 chars (PeerTube default)
  email: string;     // required
  displayName?: string;
  channel?: { name: string; displayName: string; }
}
```
- Returns 204 No Content on success
- Returns 409 Conflict if username/email taken
- Rate limited: 2 calls per 5 minutes per IP

## Decisions Made

- **Email-only signup**: Derive username from email (`email.split('@')[0]`) - simpler UX
- **No confirm password**: Use show/hide toggle instead (2024/2025 best practice)
- **Client + server validation**: Client-side for UX feedback, server-side for security
- **Auto-login after signup**: Call login API immediately after successful registration

## Important Patterns

### Form Validation (from SignIn)
Uses react-hook-form with zod resolver:
```typescript
const signInFormValidationSchema = z.object({
  username: z.string().trim().min(1, "requiredField"),
  password: z.string().trim().min(1, "requiredField"),
});
```

### Error Display Pattern
```tsx
{(isLoginError || isUserInfoError) && (
  <Typography color={colors.error500}>
    {t("signInDataIncorrect")}
  </Typography>
)}
```

### Navigation After Auth
```typescript
router.navigate({ pathname: ROUTES.HOME, params: { backend } });
```

## Next Steps
Start with Phase 1: Quick Fixes
1. Fix `selectSession()` in authSessionStore.ts
2. Add backend validation to signin.tsx redirect
3. Update error message in SignIn screen
4. Add translation keys
