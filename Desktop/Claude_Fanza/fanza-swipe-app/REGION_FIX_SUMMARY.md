# Region Configuration Fix Summary

## Problem
The Cloud Functions were deployed to `us-central1` (default region) but the client code was trying to access them in `asia-northeast1`, causing a 500 error.

## Solution Implemented

### 1. Immediate Fix
- Updated the client to use `us-central1` region to match the actual deployment
- Created a centralized configuration file for region management

### 2. Configuration Architecture
- Created `src/config/functions.js` for centralized Cloud Functions configuration
- Allows easy region switching via environment variable `VITE_FUNCTIONS_REGION`
- Provides consistent region configuration across the app

### 3. Files Modified
- `src/App.jsx` - Updated to use centralized configuration
- `src/utils/firebaseTest.js` - Updated to use centralized configuration
- `src/config/functions.js` - New configuration file (created)
- `TROUBLESHOOTING.md` - Updated with region issue documentation

### 4. Enhanced Error Handling
- Added specific error handling for region-related issues
- Improved error messages to help diagnose region problems
- Added logging to show current region configuration

## Testing the Fix
1. The app should now connect to Cloud Functions without the 500 error
2. Check browser console for: "Initializing Cloud Functions in region: us-central1"
3. Run `window.testFirebaseFunctions()` in console to verify connection

## Future Migration to asia-northeast1
If you want to move functions to Asia region for better performance:

1. Delete functions from us-central1:
   ```bash
   firebase functions:delete getFanzaVideos --region us-central1 --force
   firebase functions:delete healthCheck --region us-central1 --force
   ```

2. Deploy to asia-northeast1:
   ```bash
   firebase deploy --only functions
   ```

3. Update configuration:
   - Edit `src/config/functions.js` and change `primaryRegion` to `'asia-northeast1'`
   - Or set environment variable: `VITE_FUNCTIONS_REGION=asia-northeast1`

## Environment Variable Override
You can override the region without code changes by setting:
```bash
VITE_FUNCTIONS_REGION=asia-northeast1 npm run dev
```

This allows testing different regions without modifying code.