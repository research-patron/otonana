# Error Handling and API Configuration Guide

## Overview

This guide covers the error handling implementation for Cloud Functions API calls and how to troubleshoot common issues.

## Error Handling Implementation

### 1. Cloud Functions Configuration

The Cloud Functions are configured with:
- **Region**: asia-northeast1 (Tokyo)
- **Max Instances**: 100
- **Timeout**: 10 seconds
- **Rate Limiting**: 10 requests per minute

### 2. Client-Side Error Handling

#### API Call Structure
```javascript
const fetchFanzaVideos = async (params = {}, retryCount = 0)
```

#### Error Types and Handling

1. **Rate Limit Exceeded**
   - Error Code: `functions/resource-exhausted`
   - Handling: Returns cached videos from localStorage
   - User Message: "レート制限中です。キャッシュから動画を表示しています。"

2. **Service Unavailable**
   - Error Code: `functions/unavailable`
   - Handling: Returns cached videos
   - User Message: "サービスが一時的に利用できません"

3. **Timeout**
   - Error Code: `functions/deadline-exceeded`
   - Handling: Returns cached videos
   - User Message: "リクエストがタイムアウトしました"

4. **Internal Server Error (500)**
   - Error Code: `functions/internal`
   - Handling: Automatic retry (up to 2 attempts)
   - User Message: "サーバー内部エラーが発生しました"

5. **Missing Credentials**
   - Error Code: `functions/failed-precondition`
   - Handling: Falls back to demo data
   - User Message: "API認証情報が設定されていません"

### 3. Caching Strategy

#### Local Cache
- Duration: 5 minutes per request
- Global Cache: Up to 500 videos stored for 24 hours
- Fallback: Random selection from global cache when API fails

#### Cache Implementation
```javascript
const rateLimiter = new ApiRateLimiter();
```

Features:
- Automatic cache cleanup for expired entries
- Request tracking in localStorage
- Fallback video selection when rate limited

### 4. Health Check System

The app performs a health check on initialization:
```javascript
const checkApiHealth = async () => {
  const result = await healthCheck();
  // Returns rate limit status and API health
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. "FirebaseError: Internal" (Status 500)

**Possible Causes:**
- Missing or invalid API credentials in Secret Manager
- Cloud Function deployment issues
- FANZA API service issues

**Solutions:**
1. Check Firebase Console for function logs
2. Verify Secret Manager configuration:
   ```bash
   firebase functions:config:get
   ```
3. Redeploy functions with correct region:
   ```bash
   firebase deploy --only functions
   ```

#### 2. CORS Errors

**Solution:**
Ensure Cloud Functions are deployed in the correct region (asia-northeast1)

#### 3. Rate Limit Issues

**Solution:**
- The app automatically handles rate limiting
- Cached videos are served when limit is reached
- Wait 1 minute for limit reset

#### 4. Authentication Errors

**Solution:**
1. Verify Firebase project configuration in `src/config/firebase.js`
2. Check that all required fields are present
3. Ensure project ID matches your Firebase project

### Monitoring and Debugging

#### Enable Debug Logging
In browser console:
```javascript
localStorage.setItem('debug_mode', 'true');
```

#### Check Rate Limit Status
```javascript
const rateLimiter = new ApiRateLimiter();
console.log(rateLimiter.getRateLimitInfo());
```

#### View Cached Videos
```javascript
const rateLimiter = new ApiRateLimiter();
console.log(rateLimiter.getGlobalCache());
```

## Best Practices

1. **Always deploy functions with region specification**
   ```bash
   firebase deploy --only functions --region asia-northeast1
   ```

2. **Monitor Secret Manager**
   - Ensure FANZA_API_ID and FANZA_AFFILIATE_ID are properly set
   - Use Firebase Console to verify secrets are accessible

3. **Test locally with emulator**
   ```bash
   firebase emulators:start --only functions
   ```
   Set `VITE_USE_EMULATOR=true` in .env

4. **Regular cache cleanup**
   - The app automatically cleans old cache entries
   - Manual cleanup: `localStorage.clear()` (use with caution)

## Configuration Files

### firebase.json
```json
{
  "functions": {
    "source": "functions",
    "runtime": "nodejs18",
    "region": "asia-northeast1"
  }
}
```

### functions/index.js
```javascript
exports.getFanzaVideos = onCall(
  { 
    secrets: [fanzaApiId, fanzaAffiliateId],
    region: 'asia-northeast1',
    maxInstances: 100
  },
  async (request) => { /* ... */ }
);
```

### src/App.jsx
```javascript
const functions = getFunctions(app, 'asia-northeast1');
```

## Emergency Fallback

If all API calls fail, the app will:
1. Display demo videos (3 sample entries)
2. Show error message in loading screen
3. Continue to work in demo mode

Users can still browse the interface and test functionality without live data.