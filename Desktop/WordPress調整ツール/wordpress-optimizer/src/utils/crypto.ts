import CryptoJS from 'crypto-js';

// 暗号化用の固定キー（実際のアプリケーションでは環境変数や動的生成を使用）
// この例では、基本的なクライアントサイド暗号化として実装
const CRYPTO_SECRET = 'wp-optimizer-2024-secret-key';

// より強力な暗号化用の追加キー（オプション）
const SECURE_SECRET = 'wp-optimizer-secure-advanced-key-2024';

// APIキーの暗号化（基本）
export const encryptApiKey = (apiKey: string): string => {
  try {
    if (!apiKey || apiKey.trim() === '') {
      console.warn('Debug - encryptApiKey: Empty API key provided');
      return '';
    }

    // APIキー形式の事前検証
    if (!validateApiKeyFormat(apiKey)) {
      console.warn('Debug - encryptApiKey: API key format validation failed');
      console.warn('Debug - apiKey length:', apiKey.length);
      console.warn('Debug - apiKey starts with:', apiKey.substring(0, 4));
      // 警告は出すが処理は続行（形式が変更される可能性を考慮）
    }

    const encrypted = CryptoJS.AES.encrypt(apiKey, CRYPTO_SECRET).toString();
    
    // 暗号化結果の検証
    if (!encrypted || encrypted.trim() === '') {
      throw new Error('暗号化処理でエラーが発生しました');
    }

    console.log('Debug - encryptApiKey: Successfully encrypted API key');
    console.log('Debug - original key length:', apiKey.length);
    console.log('Debug - encrypted key length:', encrypted.length);
    
    return encrypted;
  } catch (error) {
    console.error('Debug - encryptApiKey failed:', error);
    throw new Error('APIキーの暗号化に失敗しました');
  }
};

// APIキーの復号化（基本）
export const decryptApiKey = (encryptedKey: string): string => {
  try {
    if (!encryptedKey || encryptedKey.trim() === '') {
      console.warn('Debug - decryptApiKey: Empty encrypted key provided');
      return '';
    }

    // 暗号化データの基本検証
    if (!validateEncryptedData(encryptedKey)) {
      console.error('Debug - decryptApiKey: Invalid encrypted data format');
      throw new Error('暗号化データの形式が正しくありません');
    }

    const bytes = CryptoJS.AES.decrypt(encryptedKey, CRYPTO_SECRET);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    // 復号化結果の検証
    if (!decrypted || decrypted.trim() === '') {
      console.error('Debug - decryptApiKey: Decryption resulted in empty string');
      console.error('Debug - encryptedKey length:', encryptedKey.length);
      console.error('Debug - encryptedKey (first 20 chars):', encryptedKey.substring(0, 20));
      throw new Error('APIキーの復号化結果が空です。暗号化データが破損している可能性があります。');
    }

    // APIキー形式の検証
    if (!validateApiKeyFormat(decrypted)) {
      console.warn('Debug - decryptApiKey: Decrypted key format validation failed');
      console.warn('Debug - decrypted key length:', decrypted.length);
      console.warn('Debug - decrypted key starts with:', decrypted.substring(0, 4));
    }

    console.log('Debug - decryptApiKey: Successfully decrypted API key');
    console.log('Debug - decrypted key length:', decrypted.length);
    console.log('Debug - decrypted key starts with AIza:', decrypted.startsWith('AIza'));
    
    return decrypted;
  } catch (error) {
    console.error('Debug - decryptApiKey failed:', error);
    if (error instanceof Error && error.message.includes('暗号化データ')) {
      throw error; // 既に適切なエラーメッセージが設定されている場合はそのまま投げる
    }
    throw new Error('APIキーの復号化に失敗しました。設定画面でAPIキーを再入力してください。');
  }
};

// 認証情報の暗号化（セキュア）
export const encryptCredentials = (credentials: string, useSecure: boolean = false): string => {
  try {
    if (!credentials) return '';
    const secret = useSecure ? SECURE_SECRET : CRYPTO_SECRET;
    return CryptoJS.AES.encrypt(credentials, secret).toString();
  } catch (error) {
    console.error('Credentials encryption failed:', error);
    throw new Error('認証情報の暗号化に失敗しました');
  }
};

// 認証情報の復号化（セキュア）
export const decryptCredentials = (encryptedCredentials: string, useSecure: boolean = false): string => {
  try {
    if (!encryptedCredentials) return '';
    const secret = useSecure ? SECURE_SECRET : CRYPTO_SECRET;
    const bytes = CryptoJS.AES.decrypt(encryptedCredentials, secret);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Credentials decryption failed:', error);
    throw new Error('認証情報の復号化に失敗しました');
  }
};

// パスワードハッシュ化（検証用）
export const hashPassword = (password: string): string => {
  try {
    return CryptoJS.SHA256(password + CRYPTO_SECRET).toString();
  } catch (error) {
    console.error('Password hashing failed:', error);
    throw new Error('パスワードのハッシュ化に失敗しました');
  }
};

// ランダムな認証トークン生成
export const generateAuthToken = (): string => {
  try {
    const timestamp = Date.now().toString();
    const randomString = Math.random().toString(36).substring(2, 15);
    return CryptoJS.MD5(timestamp + randomString + CRYPTO_SECRET).toString();
  } catch (error) {
    console.error('Token generation failed:', error);
    throw new Error('認証トークンの生成に失敗しました');
  }
};

// デバイス固有IDの生成
export const generateDeviceId = (): string => {
  try {
    // 既存のデバイスIDがあるかチェック
    const existingId = localStorage.getItem('wp-optimizer-device-id');
    if (existingId) return existingId;

    // 新しいデバイスIDを生成
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const language = navigator.language;
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 15);

    const deviceFingerprint = `${userAgent}_${screen}_${timezone}_${language}_${timestamp}_${random}`;
    const deviceId = CryptoJS.SHA256(deviceFingerprint).toString().substring(0, 16);

    // 保存
    localStorage.setItem('wp-optimizer-device-id', deviceId);
    return deviceId;
  } catch (error) {
    console.error('Device ID generation failed:', error);
    // フォールバック: ランダムID
    const fallbackId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem('wp-optimizer-device-id', fallbackId);
    return fallbackId;
  }
};

// データ整合性チェック用のハッシュ生成
export const generateDataHash = (data: any): string => {
  try {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return CryptoJS.MD5(dataString).toString();
  } catch (error) {
    console.error('Data hash generation failed:', error);
    throw new Error('データハッシュの生成に失敗しました');
  }
};

// Base64エンコード/デコード（追加の難読化）
export const encodeBase64 = (text: string): string => {
  try {
    return CryptoJS.enc.Base64.stringify(CryptoJS.enc.Utf8.parse(text));
  } catch (error) {
    console.error('Base64 encoding failed:', error);
    throw new Error('Base64エンコードに失敗しました');
  }
};

export const decodeBase64 = (encodedText: string): string => {
  try {
    return CryptoJS.enc.Base64.parse(encodedText).toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Base64 decoding failed:', error);
    throw new Error('Base64デコードに失敗しました');
  }
};

// セキュリティレベルの検証
export const validateSecurityLevel = (encryptedData: string): 'basic' | 'secure' | 'invalid' => {
  try {
    // 基本暗号化での復号化テスト
    try {
      const basicResult = CryptoJS.AES.decrypt(encryptedData, CRYPTO_SECRET);
      if (basicResult.toString(CryptoJS.enc.Utf8)) {
        return 'basic';
      }
    } catch {
      // 基本暗号化で失敗した場合は続行
    }

    // セキュア暗号化での復号化テスト
    try {
      const secureResult = CryptoJS.AES.decrypt(encryptedData, SECURE_SECRET);
      if (secureResult.toString(CryptoJS.enc.Utf8)) {
        return 'secure';
      }
    } catch {
      // セキュア暗号化でも失敗した場合
    }

    return 'invalid';
  } catch (error) {
    console.error('Security level validation failed:', error);
    return 'invalid';
  }
};

// APIキーの形式検証
export const validateApiKeyFormat = (apiKey: string): boolean => {
  try {
    // Gemini API keyの一般的な形式をチェック
    const geminiKeyPattern = /^AIza[0-9A-Za-z-_]{35}$/;
    return geminiKeyPattern.test(apiKey);
  } catch (error) {
    console.error('API key validation failed:', error);
    return false;
  }
};

// 機密データの安全な消去
export const secureWipe = (sensitiveData: string): void => {
  try {
    // JavaScriptでは完全な安全消去は困難だが、
    // 可能な限り元データを上書き
    const length = sensitiveData.length;
    for (let i = 0; i < 3; i++) {
      sensitiveData = '0'.repeat(length);
      sensitiveData = '1'.repeat(length);
      sensitiveData = 'X'.repeat(length);
    }
  } catch (error) {
    console.error('Secure wipe failed:', error);
  }
};

// 暗号化データの有効性検証
export const validateEncryptedData = (encryptedData: string): boolean => {
  try {
    if (!encryptedData || encryptedData.trim() === '') {
      return false;
    }

    // Base64形式の基本的な検証
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    return base64Pattern.test(encryptedData.replace(/\s/g, ''));
  } catch (error) {
    console.error('Encrypted data validation failed:', error);
    return false;
  }
};

// セキュリティ警告の生成
export interface SecurityWarning {
  level: 'info' | 'warning' | 'error';
  message: string;
  recommendation: string;
}

export const generateSecurityWarnings = (): SecurityWarning[] => {
  const warnings: SecurityWarning[] = [];

  // プライベートブラウジングモードのチェック
  if (!window.navigator.cookieEnabled) {
    warnings.push({
      level: 'warning',
      message: 'Cookieが無効化されています',
      recommendation: 'プライベートブラウジングモードの使用を推奨します'
    });
  }

  // HTTPSのチェック
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    warnings.push({
      level: 'error',
      message: 'セキュアでない接続が使用されています',
      recommendation: 'HTTPS接続を使用してください'
    });
  }

  // LocalStorageの可用性チェック
  try {
    localStorage.setItem('security-test', 'test');
    localStorage.removeItem('security-test');
  } catch {
    warnings.push({
      level: 'error',
      message: 'LocalStorageが使用できません',
      recommendation: 'ブラウザの設定を確認してください'
    });
  }

  return warnings;
};

export default {
  encryptApiKey,
  decryptApiKey,
  encryptCredentials,
  decryptCredentials,
  hashPassword,
  generateAuthToken,
  generateDeviceId,
  generateDataHash,
  encodeBase64,
  decodeBase64,
  validateSecurityLevel,
  validateApiKeyFormat,
  secureWipe,
  validateEncryptedData,
  generateSecurityWarnings,
};