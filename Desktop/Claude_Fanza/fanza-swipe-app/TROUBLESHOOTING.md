# Troubleshooting Guide for Cloud Functions 500 Error

## Error Description
"Failed to load resource: the server responded with a status of 500"
"Cloud Functions API Error: FirebaseError: API request failed"

## API Credential Issue (FIXED - Aggressive Whitespace Removal)
The 500 error was caused by API credentials containing embedded newline characters (`\n`), which resulted in 400 Bad Request errors from the FANZA API. 

### Fix Applied:
Changed from `.trim()` to `.replace(/\s+/g, '')` to remove ALL whitespace characters from credentials.

### To Deploy Fix:
```bash
cd functions
firebase deploy --only functions --force
```

### Helper Scripts:
- `./verify-deployment.sh` - Verify deployment status
- `./update-secrets.sh` - Update secrets without newlines

## Fixes Applied

### 1. Immediate Fix - Region Configuration
- Updated client to use the actual deployed region `us-central1`
- Updated: `const functions = getFunctions(app, 'us-central1');`

### 2. Enhanced Error Handling
- Added specific error code handling for different Firebase errors
- Implemented exponential backoff retry logic (up to 3 retries)
- Added fallback to cached videos when API fails
- Added fallback to demo videos when no cache is available

### 3. Improved Logging
- Added detailed console logging for debugging
- Added Firebase Functions test utility
- Enhanced error detail logging

## Common Causes of 500 Error

1. **Cloud Functions Not Deployed**
   - Verify functions are deployed: `firebase functions:list`
   - Deploy if needed: `firebase deploy --only functions`

2. **API Credentials Not Set**
   - Check if FANZA_API_ID and FANZA_AFFILIATE_ID are set in Firebase Secret Manager
   - Set secrets: 
     ```bash
     firebase functions:secrets:set FANZA_API_ID
     firebase functions:secrets:set FANZA_AFFILIATE_ID
     ```

3. **Region Mismatch**
   - Ensure client specifies same region as deployed functions
   - Fixed by adding `asia-northeast1` region

4. **CORS Issues**
   - Cloud Functions v2 handles CORS automatically
   - No additional configuration needed

## How to Debug

1. Open browser console and check for detailed error logs
2. Run `window.testFirebaseFunctions()` in console to test Firebase setup
3. Check Firebase Console for function logs
4. Verify project configuration matches between client and functions

## Migrating Functions to asia-northeast1

If you want to move the functions to asia-northeast1 for better performance in Asia:

1. **Delete existing functions from us-central1**:
   ```bash
   firebase functions:delete getFanzaVideos --region us-central1 --force
   firebase functions:delete healthCheck --region us-central1 --force
   ```

2. **Deploy to asia-northeast1**:
   ```bash
   firebase deploy --only functions
   ```

3. **Update client code back to asia-northeast1**:
   - In `src/App.jsx`: `const functions = getFunctions(app, 'asia-northeast1');`
   - In `src/utils/firebaseTest.js`: `const functions = getFunctions(app, 'asia-northeast1');`

4. **Verify deployment**:
   ```bash
   firebase functions:list
   ```

## Next Steps if Error Persists

1. Check Firebase Console > Functions for deployment status
2. Check Firebase Console > Functions > Logs for server-side errors
3. Verify API credentials are properly set in Secret Manager:
   ```bash
   firebase functions:secrets:access FANZA_API_ID
   firebase functions:secrets:access FANZA_AFFILIATE_ID
   ```
4. Ensure billing is enabled on the Firebase project
5. Try redeploying functions: `firebase deploy --only functions`