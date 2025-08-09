# Cloud Functions Deployment Instructions

## URGENT: Critical Fix for API Credential Issue

The Cloud Functions have been updated with an aggressive fix for API credentials that contain whitespace/newline characters. This was causing 400 Bad Request errors from the FANZA API.

## Deploy the Updated Functions

1. **Navigate to the functions directory**:
   ```bash
   cd functions
   ```

2. **IMPORTANT: Force deploy to ensure the latest code is used**:
   ```bash
   firebase deploy --only functions --force
   ```

   If that doesn't work, delete and redeploy:
   ```bash
   # Delete existing functions first
   firebase functions:delete getFanzaVideos --force
   firebase functions:delete healthCheck --force
   
   # Then deploy fresh
   firebase deploy --only functions
   ```

3. **Monitor the deployment**:
   ```bash
   # Watch deployment progress
   firebase deploy --only functions --debug
   
   # After deployment, monitor logs
   firebase functions:log --only getFanzaVideos
   ```

4. **Verify the fix is working**:
   Look for "API credentials status" in the logs. You should see:
   - `api_id_had_whitespace: true` (if there were newlines)
   - `api_id_cleaned_length` should be less than `api_id_original_length`
   - No more 400 errors with `%0A` in the URL

## Verify the Fix

After deployment, you should see in the logs:
- "API credentials status" with information about credential validation
- No more 400 Bad Request errors with newline characters in the URL

## Alternative: Update Secrets (if deployment doesn't fix the issue)

If the issue persists after deployment, update the secrets directly:

```bash
# Set API ID (make sure not to press Enter after the value)
firebase functions:secrets:set FANZA_API_ID

# Set Affiliate ID (make sure not to press Enter after the value)
firebase functions:secrets:set FANZA_AFFILIATE_ID
```

When prompted, enter the values WITHOUT pressing Enter at the end. Just type the value and wait for the prompt to accept it.

## What Was Fixed (Updated)

1. **Aggressive Whitespace Removal**: Changed from `.trim()` to `.replace(/\s+/g, '')` to remove ALL whitespace characters (newlines, tabs, spaces) anywhere in the credentials
2. **Enhanced Validation Logging**: Shows both original and cleaned credential lengths to verify whitespace removal
3. **Better Error Handling**: Added specific handling for 400 Bad Request errors with helpful messages
4. **Debugging Info**: Logs now show if credentials had whitespace that was removed

## After Deployment

The app should now work correctly without the 500 error. The functions will:
- Automatically trim any whitespace from credentials
- Log credential validation status
- Provide clearer error messages if credential issues occur