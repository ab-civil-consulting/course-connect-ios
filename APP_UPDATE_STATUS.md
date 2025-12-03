# Course Connect App Update - Status Report

**Date:** December 2, 2025
**Project:** Course Connect (formerly MC Assist)
**Platforms:** iOS (TestFlight) & Android (Google Play)

---

## Summary

We attempted to update both the iOS and Android versions of the Course Connect app. The iOS build completed but submission failed due to version conflict. The Android build completed but submission failed due to signing key mismatch.

---

## What Was Accomplished

### 1. Branding Updates
- Updated app icon to new **Gear Logo** across all assets:
  - `assets/icon.png`
  - `assets/splash.png`
  - `assets/favicon.png`
  - `assets/adaptive-icon-foreground.png`
  - `assets/custom-logo.png`
  - `public/logo192.png`
  - `public/logo512.png`
- Modified `InstanceInfo.tsx` to always use local logo instead of fetching from server

### 2. Code Quality Improvements
- **Environment Variables:** Moved hardcoded PostHog API key to `.env` file
- **ESLint Rules:** Added stricter TypeScript rules:
  - `@typescript-eslint/no-explicit-any: "warn"`
  - `@typescript-eslint/no-non-null-assertion: "warn"`
  - `@typescript-eslint/prefer-optional-chain: "warn"`
- **Accessibility:** Added accessibility labels to `Button` and `VideoGridCard` components

### 3. Build Optimization
- Updated `.easignore` to exclude build artifacts and reduce upload size:
  - `android/app/build`, `android/.gradle`, `android/.kotlin`
  - `ios/build`, `ios/Pods`, `ios/DerivedData`
  - `node_modules`, `.expo`, `dist`, `.git`
- Fixed git repository location (was at `C:\Dev\` instead of `C:\Dev\course-connect-ios\`)
- Archive size reduced from 1.7GB to manageable size

### 4. Bundle ID Configuration
Updated `eas.json` to use the existing app store bundle IDs:
```json
"EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER": "tv.uscreen.adamswebsite",
"EXPO_PUBLIC_ANDROID_PACKAGE": "tv.uscreen.adamswebsite"
```

### 5. Google Play Service Account
- Configured service account for automated submissions
- Added `uscreen@eco-folder-408116.iam.gserviceaccount.com` to Google Play Console
- Service account JSON key stored in EAS credentials

---

## Current Blockers

### iOS - Version Conflict
**Error:** "You've already submitted this version of the app"

**Cause:** The version number (CFBundleShortVersionString) already exists in TestFlight.

**Solution:**
```bash
eas build:version:set --platform ios
# Then rebuild and resubmit
eas build --platform ios
eas submit --platform ios --latest
```

### Android - Signing Key Mismatch
**Error:** "The Android App Bundle was signed with the wrong key"

| Key Type | SHA-1 Fingerprint |
|----------|-------------------|
| EAS Build Key | `F8:C4:90:4F:05:61:91:D2:AF:80:52:D1:B3:B0:19:D4:3D:2F:AB:25` |
| Google Play Expected | `07:98:60:58:D6:3A:97:B5:2C:25:53:FD:CE:F5:1B:24:68:A3:EF:BF` |

**Cause:** The original app was published by Uscreen with their upload key. We don't have that key.

**Solution Options:**

1. **Request Upload Key Reset** (Recommended)
   - Requires admin permission in Google Play Console
   - Contact Uscreen (`ott@uscreen.tv`) to either:
     - Grant admin permissions to your account
     - Request the upload key reset themselves
   - After approval (~24-48 hours), register EAS's key and resubmit

2. **Obtain Original Keystore**
   - Contact Uscreen to get the original `.keystore` or `.jks` file
   - Upload to EAS via `eas credentials --platform android`

3. **Publish as New App** (Last Resort)
   - Create new app with different package name (e.g., `com.abcivil.courseconnect`)
   - Existing users would need to manually download the new app
   - Would lose existing install base and reviews

---

## App Store Accounts & Access

### iOS (App Store Connect)
- **Bundle ID:** `tv.uscreen.adamswebsite`
- **Apple Team:** AB Civil Consulting, LLC (BQ49GWD329)
- **Status:** Credentials configured, ready to submit after version increment

### Android (Google Play Console)
- **Package Name:** `tv.uscreen.adamswebsite`
- **Service Account:** `uscreen@eco-folder-408116.iam.gserviceaccount.com`
- **App Signing:** Enabled (Signing by Google Play)
- **Status:** Blocked - needs upload key reset permission

### Users with Access (Google Play)
- `ott@uscreen.tv` - Uscreen OTT Apps (likely admin/owner)
- `adam%abcivilconsulting.com@gtempaccount.com` - Adam Bower
- `cpeura%abcivilconsulting.com@gtempaccount.com` - Chris Peura

---

## Files Modified

| File | Changes |
|------|---------|
| `eas.json` | Added bundle IDs, Android package name |
| `.easignore` | Optimized to exclude build artifacts |
| `.eslintrc.json` | Added stricter TypeScript rules |
| `.env` | Added PostHog API key |
| `diagnostics/index.ts` | Removed hardcoded PostHog key |
| `components/InstanceInfo.tsx` | Force local logo |
| `components/shared/Button.tsx` | Added accessibility labels |
| `components/VideoGridCard.tsx` | Added accessibility labels |
| `assets/*.png` | Updated to Gear Logo |
| `public/logo*.png` | Updated to Gear Logo |

---

## Next Steps

### Immediate (iOS)
1. Run `eas build:version:set --platform ios` to increment version
2. Rebuild: `eas build --platform ios`
3. Submit: `eas submit --platform ios --latest`

### Requires External Action (Android)
1. Contact Uscreen (`ott@uscreen.tv`) or Google Play account admin
2. Request either:
   - Admin permissions for your account, OR
   - Upload key reset approval
3. After approval, resubmit: `eas submit --platform android --latest`

---

## Commands Reference

```bash
# Build
eas build --platform ios
eas build --platform android
eas build --platform all

# Submit
eas submit --platform ios --latest
eas submit --platform android --latest

# Version management
eas build:version:set --platform ios
eas build:version:set --platform android

# Credentials
eas credentials --platform android
eas credentials --platform ios

# Check submission status
eas submit:list
```

---

## Contact Information Needed

To resolve the Android signing key issue, contact:
- **Uscreen Support** or
- **Account Owner:** `ott@uscreen.tv`

Request: "Upload key reset" permission or have them perform the reset in Google Play Console → App integrity → App signing → Request upload key reset
