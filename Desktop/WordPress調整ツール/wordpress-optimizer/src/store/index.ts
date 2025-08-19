import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { settingsService } from '../services/settings';
import type { 
  AppConfig, 
  WordPressSite, 
  DraftArticle, 
  UsageStats, 
  SiteAnalysis,
  AISuggestion 
} from '../types';

// アプリケーション設定ストア
interface AppStore {
  config: AppConfig | null;
  isInitialized: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  
  
  // 設定関連
  setConfig: (config: AppConfig) => void;
  updateGeminiApiKey: (apiKey: string) => void;
  updateSites: (sites: WordPressSite[]) => void;
  setCurrentSite: (siteId: string) => void;
  toggleDarkMode: () => void;
  
  // バックアップ関連
  createBackup: () => Promise<string>;
  restoreFromBackup: (backupData: string) => Promise<void>;
  
  // 初期化
  initialize: () => void;
}

const defaultConfig: AppConfig = {
  geminiApiKey: '',
  selectedModel: 'gemini-2.5-pro',
  sites: [],
  prompts: {
    system: 'あなたは経験豊富なWebコンテンツライターです。ユーザーが提供する情報を基に、SEOに最適化された質の高い記事提案を行ってください。',
    templates: [],
  },
  ui: {
    darkMode: false,
    language: 'ja',
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      config: null,
      isInitialized: false,
      isSyncing: false,
      lastSyncTime: null,
      
      setConfig: (config) => set({ config }),
      
      updateGeminiApiKey: (apiKey) => {
        // この関数は平文のAPIキーを受け取る
        console.log('Debug - Store: Receiving API key (plain text), length:', apiKey?.length || 0);
        
        const newConfig = {
          ...get().config,
          geminiApiKey: apiKey,
        } as AppConfig;
        
        set({ config: newConfig });
        
        // セッション設定に保存
        settingsService.saveSettings(newConfig).catch(console.error);
      },
      
      updateSites: (sites) => {
        const newConfig = {
          ...get().config,
          sites,
        } as AppConfig;
        
        set({ config: newConfig });
        
        // セッション設定に保存
        settingsService.saveSettings(newConfig).catch(console.error);
      },
      
      setCurrentSite: (siteId) => {
        const newConfig = {
          ...get().config,
          currentSiteId: siteId,
        } as AppConfig;
        
        set({ config: newConfig });
        
        // セッション設定に保存
        settingsService.saveSettings(newConfig).catch(console.error);
      },
      
      toggleDarkMode: () => {
        const state = get();
        const newConfig = {
          ...state.config,
          ui: {
            ...state.config!.ui,
            darkMode: !state.config!.ui.darkMode,
          },
        } as AppConfig;
        
        set({ config: newConfig });
        
        // セッション設定に保存
        settingsService.saveSettings(newConfig).catch(console.error);
      },
      
      
      createBackup: async () => {
        try {
          return await settingsService.createBackup();
        } catch (error) {
          console.error('Failed to create backup:', error);
          throw error;
        }
      },
      
      restoreFromBackup: async (backupData: string) => {
        try {
          const restoredConfig = await settingsService.restoreFromBackup(backupData);
          set({ config: restoredConfig });
        } catch (error) {
          console.error('Failed to restore from backup:', error);
          throw error;
        }
      },
      
      initialize: async () => {
        const state = get();
        if (!state.isInitialized) {
          console.log('Initializing app store...');
          
          // Zustand persistence から設定を読み込み、なければセッション設定、最終的にデフォルトを使用
          let initialConfig = state.config; // Zustandから復元されたconfig
          
          if (!initialConfig) {
            console.log('No persisted config found, trying session storage...');
            const sessionConfig = await settingsService.loadSettings();
            initialConfig = sessionConfig || defaultConfig;
          }
          
          console.log('Initial config loaded:', initialConfig);
          
          set({ 
            config: initialConfig, 
            isInitialized: true
          });
          
          // セッション設定にも保存して整合性を保つ
          if (initialConfig !== defaultConfig) {
            await settingsService.saveSettings(initialConfig);
          }
          
          console.log('App store initialized');
        }
      },
    }),
    {
      name: 'wp-optimizer-config',
      partialize: (state) => ({
        config: state.config,
        isInitialized: state.isInitialized
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Rehydrating app store:', state);
        if (state && !state.config) {
          // 保存された設定がない場合のみデフォルト設定を使用
          state.config = defaultConfig;
          state.isInitialized = false;
        }
      },
    }
  )
);

// 下書き記事ストア
interface DraftStore {
  drafts: DraftArticle[];
  
  addDraft: (draft: Omit<DraftArticle, 'id' | 'createdAt' | 'updatedAt'>) => DraftArticle;
  updateDraft: (id: string, updates: Partial<DraftArticle>) => void;
  deleteDraft: (id: string) => void;
  getDraft: (id: string) => DraftArticle | undefined;
  getDraftsBySite: (siteId: string) => DraftArticle[];
}

export const useDraftStore = create<DraftStore>()(
  persist(
    (set, get) => ({
      drafts: [],
      
      addDraft: (draft) => {
        const state = get();
        const now = new Date().toISOString();
        
        // 強化された重複チェック
        const existingDraft = state.drafts.find(existing => {
          // 同じサイトでなければ除外
          if (existing.siteId !== draft.siteId) return false;
          
          // AI提案IDが両方に存在する場合
          if (existing.aiSuggestionId && draft.aiSuggestionId) {
            return existing.aiSuggestionId === draft.aiSuggestionId;
          }
          
          // タイトルと作成時刻の近さでチェック（AI提案IDがない場合）
          if (existing.title.trim() === draft.title.trim()) {
            const existingTime = new Date(existing.createdAt).getTime();
            const currentTime = Date.now();
            const timeDiff = currentTime - existingTime;
            
            // 5分以内に作成された同タイトルの下書きは重複とみなす
            if (timeDiff < 5 * 60 * 1000) {
              return true;
            }
          }
          
          return false;
        });
        
        if (existingDraft) {
          // 既存の下書きを更新
          console.log('Updating existing draft instead of creating new one:', existingDraft.id);
          const updatedDraft = {
            ...existingDraft,
            ...draft,
            id: existingDraft.id, // IDは既存のものを保持
            createdAt: existingDraft.createdAt, // 作成日時は既存のものを保持
            updatedAt: now,
          };
          
          set((state) => ({
            drafts: state.drafts.map((d) =>
              d.id === existingDraft.id ? updatedDraft : d
            ),
          }));
          
          return updatedDraft;
        }
        
        // 新しい下書きを作成
        const id = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newDraft: DraftArticle = {
          ...draft,
          id,
          createdAt: now,
          updatedAt: now,
        };
        
        console.log('Creating new draft:', { id: newDraft.id, title: newDraft.title, aiSuggestionId: newDraft.aiSuggestionId });
        
        set((state) => ({
          drafts: [...state.drafts, newDraft],
        }));
        
        return newDraft;
      },
      
      updateDraft: (id, updates) => {
        const now = new Date().toISOString();
        set((state) => ({
          drafts: state.drafts.map((draft) =>
            draft.id === id 
              ? { ...draft, ...updates, updatedAt: now }
              : draft
          ),
        }));
      },
      
      deleteDraft: (id) => {
        set((state) => ({
          drafts: state.drafts.filter((draft) => draft.id !== id),
        }));
      },
      
      getDraft: (id) => {
        return get().drafts.find((draft) => draft.id === id);
      },
      
      getDraftsBySite: (siteId) => {
        return get().drafts.filter((draft) => draft.siteId === siteId);
      },
    }),
    {
      name: 'wp-optimizer-drafts',
    }
  )
);

// 使用統計ストア
interface StatsStore {
  stats: UsageStats;
  
  incrementApiCall: (tokens?: number, cost?: number) => void;
  incrementArticleCount: () => void;
  getStats: () => UsageStats;
}

export const useStatsStore = create<StatsStore>()(
  persist(
    (set, get) => ({
      stats: {
        apiCalls: { daily: {}, monthly: {} },
        tokensUsed: { daily: {}, monthly: {} },
        articlesCreated: 0,
        lastUsed: new Date().toISOString(),
        estimatedCost: { daily: {}, monthly: {} },
      },
      
      incrementApiCall: (tokens = 0, cost = 0) => {
        const today = new Date().toISOString().split('T')[0];
        const month = today.substring(0, 7);
        
        set((state) => ({
          stats: {
            ...state.stats,
            apiCalls: {
              daily: {
                ...state.stats.apiCalls.daily,
                [today]: (state.stats.apiCalls.daily[today] || 0) + 1,
              },
              monthly: {
                ...state.stats.apiCalls.monthly,
                [month]: (state.stats.apiCalls.monthly[month] || 0) + 1,
              },
            },
            tokensUsed: {
              daily: {
                ...state.stats.tokensUsed.daily,
                [today]: (state.stats.tokensUsed.daily[today] || 0) + tokens,
              },
              monthly: {
                ...state.stats.tokensUsed.monthly,
                [month]: (state.stats.tokensUsed.monthly[month] || 0) + tokens,
              },
            },
            estimatedCost: {
              daily: {
                ...state.stats.estimatedCost.daily,
                [today]: (state.stats.estimatedCost.daily[today] || 0) + cost,
              },
              monthly: {
                ...state.stats.estimatedCost.monthly,
                [month]: (state.stats.estimatedCost.monthly[month] || 0) + cost,
              },
            },
            lastUsed: new Date().toISOString(),
          },
        }));
      },
      
      incrementArticleCount: () => {
        set((state) => ({
          stats: {
            ...state.stats,
            articlesCreated: state.stats.articlesCreated + 1,
          },
        }));
      },
      
      getStats: () => get().stats,
    }),
    {
      name: 'wp-optimizer-stats',
    }
  )
);

// サイト分析データストア (セッションストレージ)
interface AnalysisStore {
  analysisData: Record<string, SiteAnalysis>;
  
  setAnalysis: (siteId: string, analysis: SiteAnalysis) => void;
  getAnalysis: (siteId: string) => SiteAnalysis | undefined;
  clearAnalysis: (siteId?: string) => void;
}

export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  analysisData: {},
  
  setAnalysis: (siteId, analysis) => {
    set((state) => ({
      analysisData: {
        ...state.analysisData,
        [siteId]: analysis,
      },
    }));
  },
  
  getAnalysis: (siteId) => {
    return get().analysisData[siteId];
  },
  
  clearAnalysis: (siteId) => {
    if (siteId) {
      set((state) => {
        const { [siteId]: removed, ...rest } = state.analysisData;
        return { analysisData: rest };
      });
    } else {
      set({ analysisData: {} });
    }
  },
}));

// AI提案ストア (セッション単位)
interface SuggestionStore {
  currentSuggestion: AISuggestion | null;
  isLoading: boolean;
  
  setSuggestion: (suggestion: AISuggestion) => void;
  clearSuggestion: () => void;
  setLoading: (loading: boolean) => void;
}

export const useSuggestionStore = create<SuggestionStore>((set) => ({
  currentSuggestion: null,
  isLoading: false,
  
  setSuggestion: (suggestion) => set({ currentSuggestion: suggestion }),
  clearSuggestion: () => set({ currentSuggestion: null }),
  setLoading: (loading) => set({ isLoading: loading }),
}));