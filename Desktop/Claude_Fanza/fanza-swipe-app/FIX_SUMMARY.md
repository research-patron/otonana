# Fix Summary: API Credential Newline Issue

## The Problem
The FANZA API was returning 400 Bad Request errors because the API credentials stored in Firebase Secret Manager contained newline characters (`\n`). These were being URL-encoded as `%0A` in the API requests.

## The Solution
Updated the Cloud Functions to aggressively remove ALL whitespace from credentials:

```javascript
// Before (didn't work for embedded newlines)
const API_ID = fanzaApiId.value().trim();

// After (removes ALL whitespace)
const API_ID = fanzaApiId.value().replace(/\s+/g, '');
```

## Deployment Steps

### 1. Deploy the Fixed Functions
```bash
cd functions
firebase deploy --only functions --force
```

### 2. Verify Deployment
```bash
# Run the verification script
./verify-deployment.sh

# Or manually check logs
firebase functions:log --only getFanzaVideos
```

### 3. What to Look For
In the logs, you should see:
- "API credentials status" showing whitespace was removed
- No more 400 errors with `%0A` in URLs
- Successful API calls returning video data

## If Still Not Working

### Option 1: Force Redeploy
```bash
cd functions
firebase functions:delete getFanzaVideos --force
firebase functions:delete healthCheck --force
firebase deploy --only functions
```

### Option 2: Update the Secrets
The root cause might be that the secrets themselves contain newlines:
```bash
firebase functions:secrets:set FANZA_API_ID
# Type: vVyu7XpkYJVmkV3PSmAN (no Enter at end)

firebase functions:secrets:set FANZA_AFFILIATE_ID  
# Type: nori06-999 (no Enter at end)
```

## Files Changed
1. `functions/index.js` - Added aggressive whitespace removal
2. `DEPLOY_INSTRUCTIONS.md` - Updated deployment guide
3. `verify-deployment.sh` - Created verification script

## Key Insight
The issue wasn't with regions or Firebase configuration - it was simply that the stored secrets contained newline characters that weren't being properly cleaned before use in the API request.