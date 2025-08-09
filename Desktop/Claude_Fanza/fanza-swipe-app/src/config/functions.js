import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Cloud Functions リージョン設定
export const FUNCTIONS_REGION = 'asia-northeast1'; // 東京リージョン

export const createFunctionsInstance = (app) => {
  const functions = getFunctions(app, FUNCTIONS_REGION);
  
  // 開発環境でエミュレータを使用する場合
  if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
    } catch (error) {
      // エミュレータが既に接続されている場合のエラーを無視
      console.warn('Functions emulator already connected:', error.message);
    }
  }
  
  return functions;
};

export default createFunctionsInstance;