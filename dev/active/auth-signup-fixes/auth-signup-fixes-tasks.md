# Auth & Signup Fixes Tasks

**Last Updated**: 2025-12-14

## Phase 1: Quick Fixes

- [ ] Fix `selectSession()` to clear stale sessions when no session found
  - File: `OwnTube.tv/store/authSessionStore.ts`
  - Change: `set({ session: loaded || undefined })`

- [ ] Add backend validation to signin redirect
  - File: `OwnTube.tv/app/(home)/signin.tsx`
  - Change: `if (session && session.backend === backend)`

- [ ] Update error message for failed login
  - File: `OwnTube.tv/screens/SignIn/index.tsx`
  - New text: "Login failed. You may already have an account."

- [ ] Add translation key
  - File: `OwnTube.tv/locales/en/translation.json`
  - Key: `signInDataIncorrectOrAlreadyRegistered`

- [ ] Test Phase 1
  - Sign in, switch backends, verify no stale session
  - Wrong credentials shows helpful error message

## Phase 2: UX Improvements

### Show/Hide Password Toggle
- [ ] Add show/hide password toggle to SignIn screen
  - Add `showPassword` state
  - Add eye icon button inside password input
  - Toggle `secureTextEntry`
  - Add accessibility labels
  - Restore focus after toggle (Android fix)

### In-App Signup
- [ ] Add `register()` method to authApi.ts
  - POST to `/api/v1/users/register`
  - Handle 409 (conflict) and 400 (validation) errors

- [ ] Add SIGNUP route constant to types.ts

- [ ] Create signup route file
  - File: `OwnTube.tv/app/(home)/signup.tsx`

- [ ] Create SignUp screen component
  - File: `OwnTube.tv/screens/SignUp/index.tsx`
  - Email field with `textContentType="emailAddress"`
  - Password field with `textContentType="newPassword"` + show/hide toggle
  - Derive username from email
  - Client-side validation (email format, password min 6 chars)
  - Loading states: idle → submitting → success → navigate
  - Error handling: 409, 400, network errors
  - Auto-login after successful registration

- [ ] Update SignIn screen
  - Replace external signup link with navigation to /signup
  - Add `textContentType="password"` to password field

- [ ] Add signup translation keys
  - createAccount, emailAlreadyRegistered, etc.

- [ ] Test Phase 2
  - Create new account in-app → auto logged in
  - Duplicate email shows "already exists" error
  - Show/hide password toggle works
  - Accessibility (screen reader labels)

## Phase 3: Proper Initialization

- [ ] Add `isInitialized` flag to auth store
  - File: `OwnTube.tv/store/authSessionStore.ts`

- [ ] Create `initializeAuthStore()` function
  - Read backend from STORAGE.DATASOURCE
  - Read session from `${backend}/auth`
  - Set initial state synchronously

- [ ] Update _layout.tsx to block until initialized
  - Call initialization before rendering RootStack
  - Show loader until `isInitialized = true`

- [ ] Simplify useAuthSessionSync
  - Remove `clearSession()` on undefined backend
  - Store already initialized with correct state

- [ ] Test Phase 3
  - Cold start: Close app completely, reopen → still logged in
  - Force quit from app switcher → still logged in
  - Test in TestFlight (not just Expo Go)
  - Rapid app close/reopen cycles
