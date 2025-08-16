import type { AppConfig, DraftArticle, UsageStats, ExportData } from '../types';

const STORAGE_KEYS = {
  CONFIG: 'wp_optimizer_config',
  DRAFTS: 'wp_optimizer_drafts',
  STATS: 'wp_optimizer_stats',
} as const;

const STORAGE_VERSION = '1.0.0';

// ローカルストレージの容量制限チェック
export const getStorageQuota = (): { used: number; available: number } => {
  let used = 0;
  let available = 5 * 1024 * 1024; // 5MB (一般的なブラウザの制限)

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
      if (estimate.quota) {
        available = estimate.quota;
      }
    });
  }

  return { used, available };
};

// ストレージ使用量の警告チェック
export const checkStorageWarning = (): boolean => {
  const { used, available } = getStorageQuota();
  return (used / available) > 0.8; // 80%を超えたら警告
};

// データのバリデーション
export const validateConfig = (config: any): config is AppConfig => {
  return (
    config &&
    typeof config === 'object' &&
    typeof config.geminiApiKey === 'string' &&
    typeof config.selectedModel === 'string' &&
    Array.isArray(config.sites) &&
    config.prompts &&
    typeof config.prompts.system === 'string' &&
    Array.isArray(config.prompts.templates) &&
    config.ui &&
    typeof config.ui.darkMode === 'boolean' &&
    typeof config.ui.language === 'string'
  );
};

export const validateDraft = (draft: any): draft is DraftArticle => {
  return (
    draft &&
    typeof draft === 'object' &&
    typeof draft.id === 'string' &&
    typeof draft.title === 'string' &&
    typeof draft.content === 'string' &&
    Array.isArray(draft.categories) &&
    Array.isArray(draft.tags) &&
    typeof draft.metaDescription === 'string' &&
    typeof draft.createdAt === 'string' &&
    typeof draft.updatedAt === 'string' &&
    typeof draft.siteId === 'string'
  );
};

// 設定の保存・読み込み
export const saveConfig = (config: AppConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config:', error);
    throw new Error('設定の保存に失敗しました。ストレージ容量を確認してください。');
  }
};

export const loadConfig = (): AppConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!stored) return null;

    const config = JSON.parse(stored);
    return validateConfig(config) ? config : null;
  } catch (error) {
    console.error('Failed to load config:', error);
    return null;
  }
};

// 下書きの保存・読み込み
export const saveDrafts = (drafts: DraftArticle[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));
  } catch (error) {
    console.error('Failed to save drafts:', error);
    throw new Error('下書きの保存に失敗しました。ストレージ容量を確認してください。');
  }
};

export const loadDrafts = (): DraftArticle[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DRAFTS);
    if (!stored) return [];

    const drafts = JSON.parse(stored);
    return Array.isArray(drafts) ? drafts.filter(validateDraft) : [];
  } catch (error) {
    console.error('Failed to load drafts:', error);
    return [];
  }
};

// 統計の保存・読み込み
export const saveStats = (stats: UsageStats): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save stats:', error);
    throw new Error('統計情報の保存に失敗しました。');
  }
};

export const loadStats = (): UsageStats | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.STATS);
    if (!stored) return null;

    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load stats:', error);
    return null;
  }
};

// エクスポート・インポート機能
export const exportAllData = (): ExportData => {
  const config = loadConfig();
  const drafts = loadDrafts();
  const stats = loadStats();

  return {
    config: config || {} as AppConfig,
    drafts,
    stats: stats || {} as UsageStats,
    version: STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
  };
};

export const importAllData = (data: ExportData): boolean => {
  try {
    // バージョン互換性チェック
    if (data.version !== STORAGE_VERSION) {
      console.warn('Version mismatch:', data.version, 'vs', STORAGE_VERSION);
    }

    // データのバリデーション
    if (data.config && validateConfig(data.config)) {
      saveConfig(data.config);
    }

    if (Array.isArray(data.drafts) && data.drafts.every(validateDraft)) {
      saveDrafts(data.drafts);
    }

    if (data.stats) {
      saveStats(data.stats);
    }

    return true;
  } catch (error) {
    console.error('Failed to import data:', error);
    return false;
  }
};

// データの完全削除
export const clearAllData = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear data:', error);
    throw new Error('データの削除に失敗しました。');
  }
};

// セッションストレージ管理
export const SESSION_KEYS = {
  SITE_ANALYSIS: 'site_analysis_cache',
  CURRENT_WORK: 'current_work',
} as const;

export const saveSessionData = <T>(key: keyof typeof SESSION_KEYS, data: T): void => {
  try {
    sessionStorage.setItem(SESSION_KEYS[key], JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save session data:', error);
  }
};

export const loadSessionData = <T>(key: keyof typeof SESSION_KEYS): T | null => {
  try {
    const stored = sessionStorage.getItem(SESSION_KEYS[key]);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to load session data:', error);
    return null;
  }
};

export const clearSessionData = (key?: keyof typeof SESSION_KEYS): void => {
  try {
    if (key) {
      sessionStorage.removeItem(SESSION_KEYS[key]);
    } else {
      sessionStorage.clear();
    }
  } catch (error) {
    console.error('Failed to clear session data:', error);
  }
};

// ファイルダウンロードヘルパー
export const downloadAsFile = (data: any, filename: string, type: string = 'application/json'): void => {
  try {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download file:', error);
    throw new Error('ファイルのダウンロードに失敗しました。');
  }
};

// ファイル読み込みヘルパー
export const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました。'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('ファイルの読み込み中にエラーが発生しました。'));
    };
    
    reader.readAsText(file);
  });
};