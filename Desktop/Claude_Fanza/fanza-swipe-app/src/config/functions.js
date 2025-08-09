// Cloud Functions configuration
import { getFunctions } from 'firebase/functions';

export const functionsConfig = {
  // Primary region where functions are currently deployed
  primaryRegion: 'asia-northeast1',
  
  // Fallback region (for future migration)
  fallbackRegion: 'asia-northeast1',
  
  // Function timeout in milliseconds
  timeout: 30000,
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    maxBackoffMs: 5000
  }
};

// Get the appropriate region based on environment
export const getFunctionsRegion = () => {
  // Check for environment variable override
  if (import.meta.env.VITE_FUNCTIONS_REGION) {
    return import.meta.env.VITE_FUNCTIONS_REGION;
  }
  
  // Use primary region by default
  return functionsConfig.primaryRegion;
};

// Helper to create a functions instance with proper region
export const createFunctionsInstance = (app) => {
  const region = getFunctionsRegion();
  return getFunctions(app, region);
};