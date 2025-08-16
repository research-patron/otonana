import type { AppConfig } from '../types';

// セッションベース設定管理サービス
export class SettingsService {
  private static instance: SettingsService;
  private sessionConfig: AppConfig | null = null;

  static getInstance(): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService();
    }
    return SettingsService.instance;
  }

  // 設定を保存（セッションメモリに保存）
  async saveSettings(config: AppConfig): Promise<void> {
    try {
      // セッションメモリに一時保存
      this.sessionConfig = { ...config };
      console.log('Settings saved to session memory (temporary)');
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('設定の保存に失敗しました');
    }
  }

  // 設定を読み込み（セッションメモリから読み込み）
  async loadSettings(): Promise<AppConfig | null> {
    try {
      // セッションメモリから読み込み
      if (this.sessionConfig) {
        console.log('Settings loaded from session memory (temporary)');
        return this.sessionConfig;
      }
      return null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      throw new Error('設定の読み込みに失敗しました');
    }
  }

  // 特定の設定項目のみ更新
  async updateSetting(key: keyof AppConfig, value: any): Promise<void> {
    try {
      // 現在の設定を取得
      const currentConfig = this.sessionConfig || {} as AppConfig;
      
      // 更新
      const updatedConfig = {
        ...currentConfig,
        [key]: value,
      };
      
      // 保存
      await this.saveSettings(updatedConfig);
      
      console.log(`Setting ${key} updated successfully`);
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw new Error('設定の更新に失敗しました');
    }
  }

  // 設定のバックアップ作成（JSON文字列）
  async createBackup(): Promise<string> {
    try {
      const config = await this.loadSettings();
      if (!config) {
        throw new Error('バックアップする設定が見つかりません');
      }

      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        config,
        source: 'session',
      };

      return JSON.stringify(backup, null, 2);
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('バックアップの作成に失敗しました');
    }
  }

  // バックアップから復元
  async restoreFromBackup(backupData: string): Promise<AppConfig> {
    try {
      const backup = JSON.parse(backupData);
      
      if (!backup.config || !backup.version) {
        throw new Error('無効なバックアップファイルです');
      }

      await this.saveSettings(backup.config);
      console.log('Settings restored from backup successfully');
      return backup.config;
    } catch (error) {
      console.error('Failed to restore from backup:', error);
      throw new Error('バックアップからの復元に失敗しました');
    }
  }

  // 設定データの削除
  async deleteSettings(): Promise<void> {
    try {
      // セッションメモリをクリア
      this.sessionConfig = null;
      console.log('Settings deleted from session memory');
    } catch (error) {
      console.error('Failed to delete settings:', error);
      throw new Error('設定の削除に失敗しました');
    }
  }

  // 現在の設定を取得（同期版）
  getCurrentSettings(): AppConfig | null {
    return this.sessionConfig;
  }
}

// シングルトンインスタンスをエクスポート
export const settingsService = SettingsService.getInstance();

// Gemini接続テスト関数
export const testGeminiConnectionSimple = async (apiKey: string, model: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'x-goog-api-key': apiKey
      }
    });

    if (response.ok) {
      return { success: true };
    } else {
      return { success: false, error: 'APIキーが無効です' };
    }
  } catch (error) {
    console.error('Gemini connection test failed:', error);
    return { success: false, error: 'Gemini APIへの接続に失敗しました' };
  }
};