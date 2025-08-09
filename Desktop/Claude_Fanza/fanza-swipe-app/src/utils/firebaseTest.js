// Firebase Functions test utility
import { httpsCallable } from 'firebase/functions';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../config/firebase';
import { createFunctionsInstance } from '../config/functions';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const functions = createFunctionsInstance(app);

// Test function to verify Firebase Functions setup
export const testFirebaseFunctions = async () => {
  
  try {
    // Test health check first
    const healthCheck = httpsCallable(functions, 'healthCheck');
    const healthResult = await healthCheck();
    
    // Test main API endpoint
    const getFanzaVideos = httpsCallable(functions, 'getFanzaVideos');
    const apiResult = await getFanzaVideos({ hits: 1, offset: 1 });
    
    return { success: true, data: apiResult.data };
  } catch (error) {
    console.error('Firebase Functions Test Failed:', error);
    
    return { success: false, error };
  }
};

// Add this function to window for easy testing in browser console
if (typeof window !== 'undefined') {
  window.testFirebaseFunctions = testFirebaseFunctions;
}